const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.findUnique({
    where: { id: 'SUPERADMIN' }
  });
  console.log('SUPERADMIN business:', business);
  const allSessions = await prisma.whatsAppSession.findMany();
  console.log('All WhatsApp sessions:', allSessions);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
