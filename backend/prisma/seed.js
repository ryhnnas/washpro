const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

// ==================== DATA LAYANAN ====================
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

// ==================== DATA PELANGGAN (12 orang) ====================
const customersData = [
  { name: "Budi Santoso", phone: "081234567890", address: "Jl. Melati No. 2, Jakarta Selatan" },
  { name: "Sari Dewi", phone: "081298765432", address: "Jl. Mawar No. 8, Jakarta Timur" },
  { name: "Ahmad Rizki", phone: "082112345678", address: "Jl. Kenanga No. 15, Bekasi" },
  { name: "Rina Marlina", phone: "081377788899", address: "Jl. Anggrek No. 3, Tangerang" },
  { name: "Dedi Kurniawan", phone: "085612345678", address: "Jl. Cempaka No. 22, Depok" },
  { name: "Lina Safitri", phone: "089912345678", address: "Jl. Dahlia No. 7, Bogor" },
  { name: "Fajar Pratama", phone: "081255566677", address: "Jl. Flamboyan No. 11, Jakarta Barat" },
  { name: "Nadia Putri", phone: "082133344455", address: "Jl. Tulip No. 9, Jakarta Utara" },
  { name: "Reza Fahlevi", phone: "081366677788", address: "Jl. Sakura No. 4, Tangerang Selatan" },
  { name: "Ayu Lestari", phone: "085755566677", address: "Jl. Kamboja No. 18, Bekasi Timur" },
  { name: "Andi Wijaya", phone: "082199988877", address: "Jl. Melati Indah No. 5, Depok" },
  { name: "Citra Kirana", phone: "081244455566", address: "Jl. Kenanga Raya No. 12, Bogor" },
];

// Fungsi helper
function getRandomDate(daysAgo = 45) {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  return past;
}

function getRandomStatus() {
  const statuses = ["PENDING", "PROSES", "SELESAI", "DIAMBIL"];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function getRandomPaymentMethod() {
  return Math.random() > 0.5 ? "CASH" : "QRIS";
}

async function main() {
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || "owner12345";
  const staffPassword = process.env.SEED_STAFF_PASSWORD || "staff12345";
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD || "adminwashpro123";

  const ownerHashedPassword = await bcrypt.hash(ownerPassword, 10);
  const staffHashedPassword = await bcrypt.hash(staffPassword, 10);
  const superAdminHashedPassword = await bcrypt.hash(superAdminPassword, 10);

  // 0. SuperAdmin
  await prisma.superAdmin.upsert({
    where: { email: "admin@washpro.com" },
    update: { name: "Super Admin WashPro", password: superAdminHashedPassword },
    create: { name: "Super Admin WashPro", email: "admin@washpro.com", password: superAdminHashedPassword },
  });
  console.log("✅ SuperAdmin seeded");

  await prisma.business.upsert({
    where: { id: "SUPERADMIN" },
    update: { name: "WashPro System" },
    create: {
      id: "SUPERADMIN",
      name: "WashPro System",
      subscriptionStatus: "SUSPENDED",
      deletedAt: new Date(),
    },
  });

  // 0b. Subscription Plans
  const planBulanan = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-bulanan-washpro" },
    update: { name: "Paket Bulanan", price: 50000, durationDays: 30, features: ["Akses Semua Fitur POS", "Staff Tanpa Batas", "Laporan & Analitik", "Notifikasi WhatsApp"], isActive: true },
    create: { id: "plan-bulanan-washpro", name: "Paket Bulanan", price: 50000, durationDays: 30, features: ["Akses Semua Fitur POS", "Staff Tanpa Batas", "Laporan & Analitik", "Notifikasi WhatsApp"], isActive: true },
  });
  const planTahunan = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-tahunan-washpro" },
    update: { name: "Paket Tahunan", price: 500000, durationDays: 365, features: ["Akses Semua Fitur POS", "Staff Tanpa Batas", "Laporan & Analitik", "Notifikasi WhatsApp", "Hemat 2 Bulan!"], isActive: true },
    create: { id: "plan-tahunan-washpro", name: "Paket Tahunan", price: 500000, durationDays: 365, features: ["Akses Semua Fitur POS", "Staff Tanpa Batas", "Laporan & Analitik", "Notifikasi WhatsApp", "Hemat 2 Bulan!"], isActive: true },
  });
  console.log("✅ Subscription Plans seeded");

  // 1. Business — set trial 7 hari dari sekarang untuk data demo
  const trialEndAt = new Date();
  trialEndAt.setDate(trialEndAt.getDate() + 7);

  const subscriptionEndAt = new Date();
  subscriptionEndAt.setDate(subscriptionEndAt.getDate() + 37); // 7 trial + 30 hari paket

  let business = await prisma.business.findFirst({
    where: { name: "WashPro Demo Laundry" },
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: "WashPro Demo Laundry",
        address: "Jl. Demo No. 123, Jakarta Selatan",
        phone: "6281234567890",
        subscriptionStatus: "ACTIVE",
        trialEndAt: trialEndAt,
        subscriptionEndAt: subscriptionEndAt,
      },
    });
  } else {
    // Update demo business agar punya data subscription yang valid
    business = await prisma.business.update({
      where: { id: business.id },
      data: {
        subscriptionStatus: "ACTIVE",
        trialEndAt: trialEndAt,
        subscriptionEndAt: subscriptionEndAt,
        phone: "6281234567890",
      },
    });
  }

  // 2. Users
  await prisma.user.upsert({
    where: { email: "owner@washpro.local" },
    update: { name: "Owner Demo", role: "OWNER", businessId: business.id, password: ownerHashedPassword, phone: "6281234567890", isEmailVerified: true, mustChangePassword: false },
    create: { name: "Owner Demo", email: "owner@washpro.local", role: "OWNER", businessId: business.id, password: ownerHashedPassword, phone: "6281234567890", isEmailVerified: true, mustChangePassword: false },
  });

  await prisma.user.upsert({
    where: { email: "staff@washpro.local" },
    update: { name: "Staff Demo", role: "STAFF", businessId: business.id, password: staffHashedPassword, phone: "6281234567890", isEmailVerified: true, mustChangePassword: false },
    create: { name: "Staff Demo", email: "staff@washpro.local", role: "STAFF", businessId: business.id, password: staffHashedPassword, phone: "6281234567890", isEmailVerified: true, mustChangePassword: false },
  });

  // 3. Business Setting
  await prisma.businessSetting.upsert({
    where: { businessId: business.id },
    update: {
      requireCustomerName: true,
      requireCustomerPhone: true,
      requireCustomerAddress: false,
      allowStaffDashboard: true,
      allowStaffCustomers: true,
      allowStaffServices: false,
      allowStaffReports: false,
      allowStaffSettings: false,
      membershipPackageName: "Paket Hemat Bulanan",
      membershipDurationDays: 30,
    },
    create: {
      businessId: business.id,
      requireCustomerName: true,
      requireCustomerPhone: true,
      requireCustomerAddress: false,
      allowStaffDashboard: true,
      allowStaffCustomers: true,
      allowStaffServices: false,
      allowStaffReports: false,
      allowStaffSettings: false,
      membershipPackageName: "Paket Hemat Bulanan",
      membershipDurationDays: 30,
    },
  });

  // 4. Services
  const serviceCount = await prisma.service.count({ where: { businessId: business.id } });
  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: defaultServices.map((s) => ({ ...s, businessId: business.id })),
    });
  }

  const services = await prisma.service.findMany({ where: { businessId: business.id } });
  const serviceMap = Object.fromEntries(services.map(s => [s.name, s]));

  // 5. Customers (12 orang)
  const createdCustomers = [];
  for (const cust of customersData) {
    const customer = await prisma.customer.upsert({
      where: { businessId_phone: { businessId: business.id, phone: cust.phone } },
      update: { name: cust.name, address: cust.address },
      create: { businessId: business.id, ...cust },
    });
    createdCustomers.push(customer);
  }

  // 6. Generate 65 Transaksi Acak
  console.log("Membuat 65 transaksi dummy...");

  const existingTxCount = await prisma.transaction.count({ where: { businessId: business.id } });
  if (existingTxCount < 30) {
    const transactionsToCreate = [];

    for (let i = 0; i < 65; i++) {
      const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
      const service = services[Math.floor(Math.random() * services.length)];

      const weight = service.type === "KILOAN" 
        ? parseFloat((Math.random() * 8 + 1).toFixed(1)) 
        : 1;

      const totalPrice = Math.round(service.price * weight);
      const status = getRandomStatus();
      const startDate = getRandomDate(45);
      const isOverdue = status !== "DIAMBIL" && Math.random() > 0.85;

      let estimatedCompletionAt = null;
      if (service.estimateUnit === "HOUR") {
        estimatedCompletionAt = new Date(startDate.getTime() + service.estimateValue * 60 * 60 * 1000);
      } else {
        estimatedCompletionAt = new Date(startDate.getTime() + service.estimateValue * 24 * 60 * 60 * 1000);
      }

      transactionsToCreate.push({
        businessId: business.id,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        serviceName: service.name,
        weight: weight,
        totalPrice: totalPrice,
        coveredAmount: 0,
        payableAmount: totalPrice,
        status: status,
        paymentMethod: getRandomPaymentMethod(),
        startDate: startDate,
        estimatedCompletionAt: estimatedCompletionAt,
        isOverdue: isOverdue,
      });
    }

    await prisma.transaction.createMany({ data: transactionsToCreate });
    console.log(`${transactionsToCreate.length} transaksi berhasil dibuat.`);
  }

  // 7. Membership Package
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

  const packageItems = [
    { serviceName: "Cuci Reguler 2 Hari", quotaAmount: 25, deductionRate: 1 },
    { serviceName: "Sepatu", quotaAmount: 2, deductionRate: 1 },
    { serviceName: "Setrika", quotaAmount: 10, deductionRate: 1 },
  ];

  await prisma.membershipPackageQuotaItem.deleteMany({ where: { templateId: template.id } });
  await prisma.membershipPackageQuotaItem.createMany({
    data: packageItems
      .filter(x => serviceMap[x.serviceName])
      .map(x => ({
        templateId: template.id,
        serviceId: serviceMap[x.serviceName].id,
        quotaAmount: x.quotaAmount,
        deductionRate: x.deductionRate,
      })),
  });

  // 8. Buat 3 Membership Aktif
  const activeCount = await prisma.customerMembership.count({
    where: { businessId: business.id, status: "ACTIVE" },
  });

  if (activeCount < 3) {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 30);

    const templateItems = await prisma.membershipPackageQuotaItem.findMany({
      where: { templateId: template.id },
    });

    for (let i = 0; i < 3; i++) {
      const customer = createdCustomers[i % createdCustomers.length];

      const membership = await prisma.customerMembership.create({
        data: {
          businessId: business.id,
          customerId: customer.id,
          templateId: template.id,
          startAt: now,
          endAt: end,
          status: "ACTIVE",
        },
      });

      if (templateItems.length > 0) {
        await prisma.customerMembershipQuotaBalance.createMany({
          data: templateItems.map(item => ({
            customerMembershipId: membership.id,
            serviceId: item.serviceId,
            initialQty: item.quotaAmount,
            remainingQty: Math.floor(item.quotaAmount * (0.5 + Math.random() * 0.5)),
          })),
        });
      }
    }
  }

  console.log("\n✅ Seed selesai dengan sukses!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`SuperAdmin : superadmin@washpro.local / ${superAdminPassword}`);
  console.log(`Owner  : owner@washpro.local / ${ownerPassword}`);
  console.log(`Staff  : staff@washpro.local / ${staffPassword}`);
  console.log(`Bisnis : ${business.name}`);
  console.log(`Status : ${business.subscriptionStatus}`);
  console.log(`Trial  : s/d ${business.trialEndAt?.toLocaleDateString('id-ID')}`);
  console.log(`Aktif  : s/d ${business.subscriptionEndAt?.toLocaleDateString('id-ID')}`);
  console.log(`Pelanggan : ${createdCustomers.length} orang`);
  console.log(`Layanan   : ${services.length} jenis`);
  console.log(`Transaksi : ±65 transaksi (45 hari terakhir)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((error) => {
    console.error("❌ Seed gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
