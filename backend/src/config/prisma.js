const { PrismaClient } = require('@prisma/client');

// Connection pool is configured via DATABASE_URL params:
// ?connection_limit=10&pool_timeout=10
// See .env.example for details.

const logConfig = [
  { emit: 'event', level: 'error' },
  { emit: 'event', level: 'warn' },
];

// Log slow queries (>2000ms) in development
if (process.env.NODE_ENV === 'development') {
  logConfig.push({ emit: 'event', level: 'query' });
}

const prisma = new PrismaClient({ log: logConfig });

prisma.$on('error', (e) => {
  console.error(`[Prisma Error] ${new Date().toISOString()}:`, e.message);
});

prisma.$on('warn', (e) => {
  console.warn(`[Prisma Warning] ${new Date().toISOString()}:`, e.message);
});

// Log slow queries in development (threshold: 2000ms)
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 2000) {
      console.warn(`[Prisma Slow Query] ${e.duration}ms:`, e.query);
    }
  });
}

if (process.env.NODE_ENV !== 'test') {
  prisma.$connect()
    .then(() => {
      console.log('✅ [Prisma] Terhubung ke Database dengan sukses.');
    })
    .catch((err) => {
      console.error('❌ [Prisma] Gagal terhubung ke Database pada startup:', err.message);
    });
}

module.exports = prisma;
