const prisma = require('../config/prisma');

/**
 * WhatsApp Queue Service
 * Menangani antrean pesan yang gagal dikirim dan melakukan retry secara berkala.
 */

const QUEUE_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
};

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;

/**
 * Menambahkan pesan ke antrean
 */
const addToQueue = async ({ businessId, phone, message }) => {
  try {
    return await prisma.whatsAppQueue.create({
      data: {
        businessId,
        customerPhone: phone,
        message,
        status: QUEUE_STATUS.PENDING,
      },
    });
  } catch (error) {
    console.error('[WA-QUEUE] Gagal menambahkan ke queue:', error.message);
  }
};

/**
 * Memproses antrean pesan (Worker)
 */
const processQueue = async (whatsappService) => {
  try {
    if (!prisma.whatsAppQueue) {
      console.warn('[WA-QUEUE] Table WhatsAppQueue belum tersedia. Pastikan migrasi sudah dijalankan.');
      return;
    }

    // Ambil pesan PENDING yang belum mencapai batas percobaan
    const pendingMessages = await prisma.whatsAppQueue.findMany({
      where: {
        status: QUEUE_STATUS.PENDING,
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (pendingMessages.length === 0) return;

    console.log(`[WA-QUEUE] Memproses ${pendingMessages.length} pesan...`);

    for (const msg of pendingMessages) {
      // Cek apakah session masih terkoneksi sebelum mengirim
      const session = await prisma.whatsAppSession.findUnique({ where: { businessId: msg.businessId } });
      
      if (!session || session.status !== 'connected') {
        console.log(`[WA-QUEUE] Bisnis ${msg.businessId} tidak terkoneksi. Skip.`);
        continue;
      }

      // Beri jeda antar pesan (Throttle) 2-5 detik
      const delay = Math.floor(Math.random() * 3000) + 2000;
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        const result = await whatsappService.sendMessage({
          businessId: msg.businessId,
          phone: msg.customerPhone,
          message: msg.message,
          skipQueue: true, // Jangan masukkan ke queue lagi jika gagal di sini (handle di catch)
        });

        if (result.ok) {
          await prisma.whatsAppQueue.update({
            where: { id: msg.id },
            data: { status: QUEUE_STATUS.SENT, attempts: msg.attempts + 1 },
          });
        } else {
          throw new Error(result.error || result.reason || 'Unknown error');
        }
      } catch (error) {
        const isLastAttempt = msg.attempts + 1 >= MAX_ATTEMPTS;
        await prisma.whatsAppQueue.update({
          where: { id: msg.id },
          data: {
            attempts: msg.attempts + 1,
            lastError: error.message,
            status: isLastAttempt ? QUEUE_STATUS.FAILED : QUEUE_STATUS.PENDING,
          },
        });
        console.error(`[WA-QUEUE] Gagal mengirim pesan ID ${msg.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[WA-QUEUE] Error saat memproses queue:', error.message);
  }
};

/**
 * Inisialisasi Worker
 */
const initWorker = (whatsappService) => {
  // Jalankan setiap 1 menit
  setInterval(() => processQueue(whatsappService), 60000);
  console.log('[WA-QUEUE] Worker diinisialisasi (Interval 1 menit)');
};

module.exports = {
  addToQueue,
  processQueue,
  initWorker,
};
