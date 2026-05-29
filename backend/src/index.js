const app = require('./app');
const prisma = require('./config/prisma');
const { startHealthCheck } = require('./services/whatsappService');
const whatsappService = require('./services/whatsappService');
const whatsappQueueService = require('./services/whatsappQueueService');

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Simpan interval IDs untuk cleanup
  const healthCheckInterval = startHealthCheck();
  whatsappQueueService.initWorker(whatsappService);

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n[${signal}] Graceful shutdown dimulai...`);
    clearInterval(healthCheckInterval);
    server.close(async () => {
      console.log('HTTP server ditutup.');
      await prisma.$disconnect();
      process.exit(0);
    });
    // Force exit jika tidak selesai dalam 10 detik
    setTimeout(() => {
      console.error('Forced shutdown setelah 10 detik.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
