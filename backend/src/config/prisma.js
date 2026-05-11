const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => {
  console.error(`[Prisma Error] ${new Date().toISOString()}:`, e.message);
});

prisma.$on('warn', (e) => {
  console.warn(`[Prisma Warning] ${new Date().toISOString()}:`, e.message);
});

prisma.$connect()
  .then(() => {
    console.log('✅ [Prisma] Terhubung ke Database dengan sukses.');
  })
  .catch((err) => {
    console.error('❌ [Prisma] Gagal terhubung ke Database pada startup:', err.message);
  });

module.exports = prisma;