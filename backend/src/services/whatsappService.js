const prisma = require('../config/prisma');
const whatsappQueueService = require('./whatsappQueueService');

const formatIDR = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const normalizePhone = (raw) => {
  if (!raw) return null;
  let phone = String(raw).replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '62' + phone.slice(1);
  else if (phone.startsWith('8')) phone = '62' + phone;
  else if (phone.startsWith('62')) {/* sudah benar */ }
  else return null;
  return phone;
};

// Global config from .env
const getGatewayUrl = () => (process.env.GOWA_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const getGatewayHeaders = (businessId) => {
  const headers = { 'Content-Type': 'application/json' };
  const username = process.env.GOWA_USERNAME;
  const password = process.env.GOWA_PASSWORD;
  if (username && password) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }
  if (businessId) {
    headers['X-Device-Id'] = businessId;
  }
  return headers;
};

const ensureBusinessForWhatsApp = async (businessId) => {
  if (!businessId) return null;

  const existing = await prisma.business.findUnique({ where: { id: businessId } }).catch(() => null);
  if (existing) return existing;

  if (businessId !== 'SUPERADMIN') return null;

  try {
    return await prisma.business.create({
      data: {
        id: 'SUPERADMIN',
        name: 'WashPro System',
        subscriptionStatus: 'SUSPENDED',
        deletedAt: new Date(),
      },
    });
  } catch (err) {
    const retry = await prisma.business.findUnique({ where: { id: businessId } }).catch(() => null);
    if (retry) return retry;
    throw err;
  }
};

// 1. Session Management
const checkConnectionStatus = async (businessId) => {
  try {
    const business = await ensureBusinessForWhatsApp(businessId);
    if (!business) throw new Error('Bisnis tidak ditemukan');

    const res = await fetch(`${getGatewayUrl()}/devices/${businessId}/status`, {
      headers: getGatewayHeaders(businessId),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const isConnected = data.results?.is_connected === true || data.data?.status === 'CONNECTED';

    await prisma.whatsAppSession.upsert({
      where: { businessId },
      create: { businessId, status: isConnected ? 'connected' : 'disconnected' },
      update: {
        status: isConnected ? 'connected' : 'disconnected',
        lastConnected: isConnected ? new Date() : null
      },
    });

    return { status: isConnected ? 'connected' : 'disconnected', detail: data.results || data.data };
  } catch (err) {
    const business = await ensureBusinessForWhatsApp(businessId);
    if (business) {
      await prisma.whatsAppSession.upsert({
        where: { businessId },
        create: { businessId, status: 'error', lastError: err.message },
        update: { status: 'error', lastError: err.message },
      }).catch(() => { });
    }
    return { status: 'error', detail: err.message };
  }
};

const updateSession = async (businessId, data) => {
  try {
    const business = await ensureBusinessForWhatsApp(businessId);
    if (!business) {
      console.warn(`WhatsApp updateSession: businessId ${businessId} not found, skipping.`);
      return null;
    }
    return prisma.whatsAppSession.upsert({
      where: { businessId },
      create: { businessId, phoneNumber: 'UNKNOWN', ...data },
      update: data,
    });
  } catch (err) {
    console.error('WhatsApp updateSession error:', err.message);
    return null;
  }
};

// Ensure a device is registered on GOWA before attempting login
const ensureDevice = async (businessId) => {
  try {
    // Cek dulu apakah device sudah ada
    const checkRes = await fetch(`${getGatewayUrl()}/devices`, {
      headers: getGatewayHeaders(),
    });

    if (checkRes.ok) {
      const devices = await checkRes.json();
      const deviceList = devices.results || devices.data || [];

      const existingDevice = deviceList.find(d => d.id === businessId);

      if (existingDevice) {
        console.log('[WA] Device sudah ada, skip create');
        return true;
      }
    }

    // Jika belum ada, baru buat
    const createRes = await fetch(`${getGatewayUrl()}/devices`, {
      method: 'POST',
      headers: getGatewayHeaders(),
      body: JSON.stringify({ device_id: businessId }),
    });

    const text = await createRes.text();
    console.log('[WA] ensureDevice create → Status:', createRes.status, text.substring(0, 150));

    // 409 Conflict atau 500 Internal Server Error (dengan pesan already exists) dianggap sukses
    return createRes.ok || createRes.status === 409 || (createRes.status === 500 && text.includes('already exists'));
  } catch (err) {
    console.error('[WA] ensureDevice error:', err.message);
    return false;
  }
};

const loginWithQR = async (businessId, retry = 0) => {
  try {
    const business = await ensureBusinessForWhatsApp(businessId);
    if (!business) throw new Error('Bisnis tidak ditemukan');

    // Step 1: Register device
    await ensureDevice(businessId);

    // Step 2: Request QR code using /app/login
    const url = `${getGatewayUrl()}/app/login`;
    console.log('[WA] loginWithQR → GET', url);
    const res = await fetch(url, {
      method: 'GET',
      headers: getGatewayHeaders(businessId),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    console.log('[WA] loginWithQR → Status:', res.status, '| Body:', text.substring(0, 300));
    if (!res.ok) {
      throw new Error(`GOWA ${res.status}: ${text.substring(0, 150)}`);
    }
    const data = JSON.parse(text);

    await prisma.whatsAppSession.upsert({
      where: { businessId },
      create: { businessId, status: 'connecting', connectedVia: 'qr' },
      update: { status: 'connecting', connectedVia: 'qr' },
    });
    return { ok: true, qr: data.results?.qr_link || data.results };
  } catch (err) {
    if (retry < 3) {
      console.log('[WA] loginWithQR retrying...', retry + 1);
      return loginWithQR(businessId, retry + 1);
    }
    console.error('[WA] loginWithQR error:', err.message);
    const business = await ensureBusinessForWhatsApp(businessId);
    if (business) {
      await prisma.whatsAppSession.upsert({
        where: { businessId },
        create: { businessId, status: 'error', lastError: err.message },
        update: { status: 'error', lastError: err.message },
      }).catch(() => { });
    }
    return { ok: false, error: err.message };
  }
};

const loginWithCode = async (businessId, phoneNumber) => {
  try {
    const business = await ensureBusinessForWhatsApp(businessId);
    if (!business) throw new Error('Bisnis tidak ditemukan');

    const target = normalizePhone(phoneNumber);
    if (!target) throw new Error('Format nomor HP tidak valid');

    await ensureDevice(businessId);

    const res = await fetch(`${getGatewayUrl()}/app/login-with-code?phone=${target}`, {
      method: 'GET',
      headers: getGatewayHeaders(businessId),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    console.log('[WA] loginWithCode → Status:', res.status, '| Body:', text.substring(0, 300));
    if (!res.ok) {
      throw new Error(`GOWA ${res.status}: ${text.substring(0, 150)}`);
    }
    const data = JSON.parse(text);

    await prisma.whatsAppSession.upsert({
      where: { businessId },
      create: { businessId, phoneNumber: target, status: 'connecting', connectedVia: 'pairing_code' },
      update: { phoneNumber: target, status: 'connecting', connectedVia: 'pairing_code' },
    });
    return { ok: true, code: data.results?.pair_code || data.results };
  } catch (err) {
    console.error('[WA] loginWithCode error:', err.message);
    const business = await ensureBusinessForWhatsApp(businessId);
    if (business) {
      await prisma.whatsAppSession.upsert({
        where: { businessId },
        create: { businessId, status: 'error', lastError: err.message },
        update: { status: 'error', lastError: err.message },
      }).catch(() => { });
    }
    return { ok: false, error: err.message };
  }
};

const logoutDevice = async (businessId) => {
  try {
    const business = await ensureBusinessForWhatsApp(businessId);
    if (!business) throw new Error('Bisnis tidak ditemukan');

    // Gunakan endpoint RESTful untuk logout di v8
    await fetch(`${getGatewayUrl()}/devices/${businessId}/logout`, {
      method: 'POST',
      headers: getGatewayHeaders(businessId),
    });
    await prisma.whatsAppSession.upsert({
      where: { businessId },
      create: { businessId, status: 'disconnected' },
      update: { status: 'disconnected' },
    }).catch(() => { });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// 2. Messaging
const sendMessage = async ({ businessId, phone, message, skipQueue = false }) => {
  const target = normalizePhone(phone);
  if (!target) return { ok: false, skipped: true, reason: 'NO_PHONE' };

  if (process.env.GOWA_ENABLED === 'false') {
    return { ok: false, skipped: true, reason: 'WA_DISABLED_GLOBALLY' };
  }

  // SUPERADMIN tidak punya FK ke Business table — skip queue, langsung kirim atau skip
  const isSuperAdmin = businessId === 'SUPERADMIN';

  const session = await prisma.whatsAppSession.findUnique({ where: { businessId } }).catch(() => null);
  
  // Jika tidak terkoneksi dan bukan dari worker queue, masukkan ke queue
  // (SUPERADMIN tidak masuk queue karena tidak ada FK target di Business)
  if ((!session || session.status !== 'connected') && !skipQueue) {
    if (isSuperAdmin) {
      return { ok: false, skipped: true, reason: 'SUPERADMIN_WA_NOT_CONNECTED' };
    }
    await whatsappQueueService.addToQueue({ businessId, phone: target, message });
    return { ok: false, queued: true, reason: 'SESSION_NOT_CONNECTED' };
  }

  // Jika tetap dipaksa kirim (misal dari worker) tapi session mati, return error
  if (!session || session.status !== 'connected') {
    return { ok: false, skipped: true, reason: 'SESSION_NOT_CONNECTED' };
  }

  try {
    const res = await fetch(`${getGatewayUrl()}/send/message`, {
      method: 'POST',
      headers: getGatewayHeaders(businessId),
      body: JSON.stringify({ phone: target, message }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 || data.message?.toLowerCase().includes('not connected')) {
        await updateSession(businessId, { status: 'disconnected', lastError: 'Session dropped during send' });
      }

      // Jika gagal sistem (5xx atau timeout), masukkan ke queue jika belum di queue
      // SUPERADMIN tidak masuk queue (tidak ada FK target)
      if (!skipQueue && !isSuperAdmin && (res.status >= 500 || res.status === 401)) {
        await whatsappQueueService.addToQueue({ businessId, phone: target, message });
        return { ok: false, queued: true, status: res.status, error: data?.message || data?.error || `HTTP ${res.status}` };
      }

      return { ok: false, status: res.status, error: data?.message || data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    // Jika timeout atau network error, masukkan ke queue
    // SUPERADMIN tidak masuk queue (tidak ada FK target)
    if (!skipQueue && !isSuperAdmin) {
      await whatsappQueueService.addToQueue({ businessId, phone: target, message });
      return { ok: false, queued: true, error: err.message };
    }
    return { ok: false, error: err.message };
  }
};

const getBusinessConfig = async (businessId) => {
  const setting = await prisma.businessSetting.findUnique({ where: { businessId } });
  if (!setting) return null;
  
  let whatsappTemplates = { RECEIPT: null, PROSES: null, SELESAI: null, DIAMBIL: null };
  
  // Prioritas kolom baru
  if (setting.whatsappTemplates) {
    try {
      whatsappTemplates = { ...whatsappTemplates, ...JSON.parse(setting.whatsappTemplates) };
      return { whatsappTemplates };
    } catch (e) { console.error('Error parsing whatsappTemplates:', e); }
  }

  return { whatsappTemplates };
};

const buildReceiptMessage = async ({ business, transaction }) => {
  const ts = new Date(transaction.startDate || Date.now());
  const tanggal = ts.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
  const id = transaction.id?.split('-')[0]?.toUpperCase() || '';
  const items = Array.isArray(transaction.lineItems) ? transaction.lineItems : null;
  const detailLines = items && items.length > 0
    ? items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.serviceName} — ${item.qty} ${item.unit} x ${formatIDR(item.price)} = ${formatIDR(
            item.lineTotal
          )}`
      )
      .join('\n')
    : `Layanan : ${transaction.serviceName}\nJumlah  : ${transaction.weight}`;

  // Ambil template dari settings
  const config = await getBusinessConfig(business.id);
  let template = config?.whatsappTemplates?.RECEIPT;

  if (!template) {
    template = `*{{businessName}}*\nNota Digital — #{{orderId}}\n{{separator}}\nHalo *{{customerName}}*,\nTerima kasih telah mempercayakan cucian Anda.\n\n*Detail Pesanan*\n{{detailItems}}\n\nBayar   : {{paymentMethod}}\nTotal   : *{{totalPrice}}*\nStatus  : {{status}}\nWaktu   : {{date}}\n{{separator}}\nSimpan pesan ini sebagai bukti transaksi.\n_Nota dikirim otomatis oleh sistem._`;
  }

  return template
    .replace(/{{businessName}}/g, business?.name || 'WashPro')
    .replace(/{{orderId}}/g, id)
    .replace(/{{customerName}}/g, transaction.customerName || 'Pelanggan')
    .replace(/{{detailItems}}/g, detailLines)
    .replace(/{{paymentMethod}}/g, transaction.paymentMethod)
    .replace(/{{totalPrice}}/g, formatIDR(transaction.totalPrice))
    .replace(/{{status}}/g, transaction.status)
    .replace(/{{date}}/g, tanggal)
    .replace(/{{separator}}/g, '-'.repeat(28));
};



const buildStatusMessage = async ({ business, transaction }) => {
  const id = transaction.id?.split('-')[0]?.toUpperCase() || '';
  const statusLabel = {
    PENDING: 'Sedang Antri',
    PROSES: 'Sedang Dikerjakan',
    SELESAI: 'Selesai & Siap Diambil',
    DIAMBIL: 'Telah Diambil — Terima Kasih!',
  }[transaction.status] || transaction.status;

  const config = await getBusinessConfig(business.id);
  let template = config?.whatsappTemplates?.[transaction.status];

  if (!template) {
    // Default fallback templates for each status
    const defaults = {
      PROSES: `*{{businessName}}*\nUpdate Status #{{orderId}}\n{{separator}}\nHalo *{{customerName}}*,\n\nPesanan Anda *{{serviceName}}* sekarang berstatus:\n*{{statusLabel}}*\n\nMohon ditunggu ya, kami sedang mengerjakannya dengan sepenuh hati.`,
      SELESAI: `*{{businessName}}*\nUpdate Status #{{orderId}}\n{{separator}}\nHalo *{{customerName}}*,\n\nPesanan Anda *{{serviceName}}* sekarang berstatus:\n*{{statusLabel}}*\n\nSilakan datang ke gerai untuk pengambilan. Terima kasih!`,
      DIAMBIL: `*{{businessName}}*\nUpdate Status #{{orderId}}\n{{separator}}\nHalo *{{customerName}}*,\n\nPesanan Anda *{{serviceName}}* sekarang berstatus:\n*{{statusLabel}}*\n\nTerima kasih telah menggunakan jasa kami. Sampai jumpa kembali!`,
    };
    template = defaults[transaction.status] || `*{{businessName}}*\nUpdate Status #{{orderId}}\n{{separator}}\nHalo *{{customerName}}*,\n\nPesanan Anda *{{serviceName}}* sekarang berstatus:\n*{{statusLabel}}*`;
  }

  return template
    .replace(/{{businessName}}/g, business?.name || 'WashPro')
    .replace(/{{orderId}}/g, id)
    .replace(/{{customerName}}/g, transaction.customerName || 'Pelanggan')
    .replace(/{{serviceName}}/g, transaction.serviceName)
    .replace(/{{statusLabel}}/g, statusLabel)
    .replace(/{{separator}}/g, '-'.repeat(28));
};


const sendReceipt = async ({ businessId, transaction }) => {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const message = await buildReceiptMessage({ business, transaction });
  return sendMessage({ businessId, phone: transaction.customerPhone, message });
};


const sendStatusUpdate = async ({ businessId, transaction }) => {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const message = await buildStatusMessage({ business, transaction });
  return sendMessage({ businessId, phone: transaction.customerPhone, message });
};


// 3. Health Checker Loop (Bisa dipanggil di server start)
// Optimized: runs every 5 min, max 10 sessions per cycle,
// random jitter (0-30s) between checks to avoid thundering herd.
const startHealthCheck = () => {
  const intervalId = setInterval(async () => {
    try {
      const activeSessions = await prisma.whatsAppSession.findMany({
        where: { status: { in: ['connected', 'connecting'] } },
        take: 10,
      });
      console.log(`[WhatsApp Health Check] Checking ${activeSessions.length} session(s)...`);
      for (const session of activeSessions) {
        // Random jitter 0-30s between each check to spread load
        await new Promise(r => setTimeout(r, Math.random() * 30000));
        await checkConnectionStatus(session.businessId);
      }
    } catch (err) {
      console.error('WhatsApp Health Check Error:', err.message);
    }
  }, 300000);

  // Return intervalId agar bisa di-clear saat graceful shutdown
  return intervalId;
};

module.exports = {
  checkConnectionStatus,
  loginWithQR,
  loginWithCode,
  logoutDevice,
  sendMessage,
  sendReceipt,
  sendStatusUpdate,
  buildReceiptMessage,
  buildStatusMessage,
  normalizePhone,
  startHealthCheck,
};
