const prisma = require('../config/prisma');

/**
 * Integrasi WhatsApp Gateway (GOWA - Go-WhatsApp-Web-MultiDevice).
 * Sesuai proposal: nota digital dikirim otomatis ke nomor pelanggan setelah transaksi diproses.
 *
 * GOWA REST API reference:
 *   https://github.com/aldinokemal/go-whatsapp-web-multidevice
 *   POST /send/message  body: { phone, message }   auth: Basic (username:password)
 *
 * Konfigurasi dapat diisi global via .env (GOWA_API_URL/USERNAME/PASSWORD)
 * atau per-bisnis via tabel BusinessSetting (whatsappApiUrl/whatsappUsername/whatsappPassword).
 * Pengaturan per-bisnis lebih diutamakan jika tersedia.
 */

const formatIDR = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const normalizePhone = (raw) => {
  if (!raw) return null;
  let phone = String(raw).replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '62' + phone.slice(1);
  else if (phone.startsWith('8')) phone = '62' + phone;
  else if (phone.startsWith('62')) {/* sudah benar */}
  else return null;
  return phone;
};

const getGatewayConfig = async (businessId) => {
  let setting = null;
  if (businessId) {
    setting = await prisma.businessSetting.findUnique({ where: { businessId } });
  }

  const apiUrl = setting?.whatsappApiUrl || process.env.GOWA_API_URL;
  const username = setting?.whatsappUsername || process.env.GOWA_USERNAME;
  const password = setting?.whatsappPassword || process.env.GOWA_PASSWORD;
  const enabled = setting?.whatsappEnabled ?? (process.env.GOWA_ENABLED === 'true');
  const senderName = setting?.whatsappSenderName || setting?.business?.name || 'WashPro';

  return { apiUrl, username, password, enabled, senderName };
};

const sendMessage = async ({ businessId, phone, message }) => {
  const target = normalizePhone(phone);
  if (!target) {
    return { ok: false, skipped: true, reason: 'NO_PHONE' };
  }

  const { apiUrl, username, password, enabled } = await getGatewayConfig(businessId);

  if (!enabled) return { ok: false, skipped: true, reason: 'WA_DISABLED' };
  if (!apiUrl) return { ok: false, skipped: true, reason: 'NO_API_URL' };

  const headers = { 'Content-Type': 'application/json' };
  if (username && password) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  try {
    const url = apiUrl.replace(/\/$/, '') + '/send/message';
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: target, message }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, error: data?.message || data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

const buildReceiptMessage = ({ business, transaction }) => {
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
  return (
    `*${business?.name || 'WashPro'}*\n` +
    `Nota Digital — #${id}\n` +
    `${'-'.repeat(28)}\n` +
    `Halo *${transaction.customerName || 'Pelanggan'}*,\n` +
    `Terima kasih telah mempercayakan cucian Anda.\n\n` +
    `*Detail Pesanan*\n` +
    `${detailLines}\n` +
    `Bayar   : ${transaction.paymentMethod}\n` +
    `Total   : *${formatIDR(transaction.totalPrice)}*\n` +
    `Status  : ${transaction.status}\n` +
    `Waktu   : ${tanggal}\n` +
    `${'-'.repeat(28)}\n` +
    `Simpan pesan ini sebagai bukti transaksi.\n` +
    `_Nota dikirim otomatis oleh sistem._`
  );
};

const buildStatusMessage = ({ business, transaction }) => {
  const id = transaction.id?.split('-')[0]?.toUpperCase() || '';
  const statusLabel = {
    PENDING: 'Sedang Antri',
    PROSES: 'Sedang Dikerjakan',
    SELESAI: 'Selesai & Siap Diambil',
    DIAMBIL: 'Telah Diambil — Terima Kasih!',
  }[transaction.status] || transaction.status;
  return (
    `*${business?.name || 'WashPro'}*\n` +
    `Update Status #${id}\n` +
    `${'-'.repeat(28)}\n` +
    `Halo *${transaction.customerName || 'Pelanggan'}*,\n\n` +
    `Pesanan Anda *${transaction.serviceName}* sekarang berstatus:\n` +
    `*${statusLabel}*\n\n` +
    `${transaction.status === 'SELESAI' ? 'Silakan datang ke gerai untuk pengambilan.' : ''}` +
    `${transaction.status === 'DIAMBIL' ? 'Sampai jumpa pada cucian berikutnya!' : ''}`
  );
};

const sendReceipt = async ({ businessId, transaction }) => {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const message = buildReceiptMessage({ business, transaction });
  return sendMessage({ businessId, phone: transaction.customerPhone, message });
};

const sendStatusUpdate = async ({ businessId, transaction }) => {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const message = buildStatusMessage({ business, transaction });
  return sendMessage({ businessId, phone: transaction.customerPhone, message });
};

const checkGateway = async (businessId) => {
  const cfg = await getGatewayConfig(businessId);
  if (!cfg.enabled) return { ok: false, reason: 'DISABLED' };
  if (!cfg.apiUrl) return { ok: false, reason: 'NO_API_URL' };

  const headers = {};
  if (cfg.username && cfg.password) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64');
  }
  try {
    const url = cfg.apiUrl.replace(/\/$/, '') + '/app/devices';
    const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json().catch(() => ({}));
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

module.exports = {
  sendMessage,
  sendReceipt,
  sendStatusUpdate,
  buildReceiptMessage,
  buildStatusMessage,
  normalizePhone,
  checkGateway,
};
