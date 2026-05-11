const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

const defaultServices = [
  { name: "Setrika", price: 4000, type: "KILOAN", unit: "kg", estimateValue: 12, estimateUnit: "HOUR" },
  { name: "Cuci Kering Parfum", price: 5000, type: "KILOAN", unit: "kg", estimateValue: 1, estimateUnit: "DAY" },
  { name: "Cuci Standar 3 Hari", price: 6500, type: "KILOAN", unit: "kg", estimateValue: 3, estimateUnit: "DAY" },
  { name: "Cuci Reguler 2 Hari", price: 7500, type: "KILOAN", unit: "kg", estimateValue: 2, estimateUnit: "DAY" },
  { name: "Cuci Express 1 Hari", price: 9000, type: "KILOAN", unit: "kg", estimateValue: 1, estimateUnit: "DAY" },
  { name: "Cuci Kilat 12 Jam", price: 12000, type: "KILOAN", unit: "kg", estimateValue: 12, estimateUnit: "HOUR" },
  { name: "Cuci Kilat 6 Jam", price: 15000, type: "KILOAN", unit: "kg", estimateValue: 6, estimateUnit: "HOUR" },
  { name: "Bedcover", price: 25000, type: "SATUAN", unit: "pcs", estimateValue: 2, estimateUnit: "DAY" },
  { name: "Selimut", price: 15000, type: "SATUAN", unit: "pcs", estimateValue: 2, estimateUnit: "DAY" },
  { name: "Seprai Set", price: 10000, type: "SATUAN", unit: "pcs", estimateValue: 1, estimateUnit: "DAY" },
  { name: "Boneka", price: 20000, type: "SATUAN", unit: "pcs", estimateValue: 2, estimateUnit: "DAY" },
  { name: "Karpet", price: 15000, type: "SATUAN", unit: "m2", estimateValue: 2, estimateUnit: "DAY" },
  { name: "Sepatu", price: 20000, type: "SATUAN", unit: "pasang", estimateValue: 3, estimateUnit: "DAY" },
];

async function main() {
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || "owner12345";
  const staffPassword = process.env.SEED_STAFF_PASSWORD || "staff12345";

  const ownerHashedPassword = await bcrypt.hash(ownerPassword, 10);
  const staffHashedPassword = await bcrypt.hash(staffPassword, 10);

  let business = await prisma.business.findFirst({
    where: { name: "WashPro Demo Laundry" },
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: "WashPro Demo Laundry",
        address: "Jl. Demo No. 123, Jakarta",
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "owner@washpro.local" },
    update: {
      name: "Owner Demo",
      role: "OWNER",
      businessId: business.id,
      password: ownerHashedPassword,
    },
    create: {
      name: "Owner Demo",
      email: "owner@washpro.local",
      role: "OWNER",
      businessId: business.id,
      password: ownerHashedPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@washpro.local" },
    update: {
      name: "Staff Demo",
      role: "STAFF",
      businessId: business.id,
      password: staffHashedPassword,
    },
    create: {
      name: "Staff Demo",
      email: "staff@washpro.local",
      role: "STAFF",
      businessId: business.id,
      password: staffHashedPassword,
    },
  });

  await prisma.businessSetting.upsert({
    where: { businessId: business.id },
    update: {
      requireCustomerName: true,
      requireCustomerPhone: true,
      requireCustomerAddress: false,
      staffAllowedMenus: JSON.stringify(["CASHIER", "TRACKING"]),
      membershipPackageName: "Paket Hemat Bulanan",
      membershipDurationDays: 30,
    },
    create: {
      businessId: business.id,
      requireCustomerName: true,
      requireCustomerPhone: true,
      requireCustomerAddress: false,
      staffAllowedMenus: JSON.stringify(["CASHIER", "TRACKING"]),
      membershipPackageName: "Paket Hemat Bulanan",
      membershipDurationDays: 30,
    },
  });

  const serviceCount = await prisma.service.count({
    where: { businessId: business.id },
  });

  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: defaultServices.map((service) => ({
        ...service,
        businessId: business.id,
      })),
    });
  }
  if (serviceCount > 0) {
    for (const svc of defaultServices) {
      await prisma.service.updateMany({
        where: { businessId: business.id, name: svc.name },
        data: { estimateValue: svc.estimateValue, estimateUnit: svc.estimateUnit },
      });
    }
  }

  const customerA = await prisma.customer.upsert({
    where: {
      businessId_phone: {
        businessId: business.id,
        phone: "081234567890",
      },
    },
    update: {
      name: "Budi",
      address: "Jl. Melati No. 2",
    },
    create: {
      businessId: business.id,
      name: "Budi",
      phone: "081234567890",
      address: "Jl. Melati No. 2",
    },
  });

  await prisma.customer.upsert({
    where: {
      businessId_phone: {
        businessId: business.id,
        phone: "081298765432",
      },
    },
    update: {
      name: "Sari",
      address: "Jl. Mawar No. 8",
    },
    create: {
      businessId: business.id,
      name: "Sari",
      phone: "081298765432",
      address: "Jl. Mawar No. 8",
    },
  });

  const sampleTransaction = await prisma.transaction.findFirst({
    where: {
      businessId: business.id,
      customerName: "Budi",
      serviceName: "Cuci Reguler 2 Hari",
    },
  });

  if (!sampleTransaction) {
    await prisma.transaction.create({
      data: {
        businessId: business.id,
        customerId: customerA.id,
        customerName: "Budi",
        customerPhone: "081234567890",
        customerAddress: "Jl. Melati No. 2",
        serviceName: "Cuci Reguler 2 Hari",
        weight: 3,
        totalPrice: 22500,
        coveredAmount: 0,
        payableAmount: 22500,
        status: "PENDING",
        paymentMethod: "CASH",
        estimatedCompletionAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        isOverdue: false,
      },
    });
  }

  // Template paket membership tunggal
  let template = await prisma.membershipPackageTemplate.findFirst({
    where: { businessId: business.id, isActive: true },
  });
  if (!template) {
    template = await prisma.membershipPackageTemplate.create({
      data: {
        businessId: business.id,
        name: "Paket Hemat Bulanan",
        durationDays: 30,
        isActive: true,
      },
    });
  }

  const serviceByName = Object.fromEntries(
    (await prisma.service.findMany({ where: { businessId: business.id } })).map((s) => [s.name, s])
  );
  const packageItems = [
    { serviceName: "Cuci Reguler 2 Hari", quotaAmount: 25, deductionRate: 1 },
    { serviceName: "Sepatu", quotaAmount: 2, deductionRate: 1 },
    { serviceName: "Setrika", quotaAmount: 10, deductionRate: 1 },
  ];
  await prisma.membershipPackageQuotaItem.deleteMany({ where: { templateId: template.id } });
  await prisma.membershipPackageQuotaItem.createMany({
    data: packageItems
      .filter((x) => serviceByName[x.serviceName])
      .map((x) => ({
        templateId: template.id,
        serviceId: serviceByName[x.serviceName].id,
        quotaAmount: x.quotaAmount,
        deductionRate: x.deductionRate,
      })),
  });

  // Membership aktif untuk customer Budi
  const oldMemberships = await prisma.customerMembership.findMany({
    where: { businessId: business.id, customerId: customerA.id, status: "ACTIVE" },
  });
  if (oldMemberships.length === 0) {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    const customerMembership = await prisma.customerMembership.create({
      data: {
        businessId: business.id,
        customerId: customerA.id,
        templateId: template.id,
        startAt: now,
        endAt: end,
        status: "ACTIVE",
      },
    });

    const templateItems = await prisma.membershipPackageQuotaItem.findMany({
      where: { templateId: template.id },
    });
    if (templateItems.length > 0) {
      await prisma.customerMembershipQuotaBalance.createMany({
        data: templateItems.map((item) => ({
          customerMembershipId: customerMembership.id,
          serviceId: item.serviceId,
          initialQty: item.quotaAmount,
          remainingQty: item.quotaAmount,
        })),
      });
    }
  }

  console.log("Seed selesai.");
  console.log("Owner login: owner@washpro.local /", ownerPassword);
  console.log("Staff login: staff@washpro.local /", staffPassword);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
