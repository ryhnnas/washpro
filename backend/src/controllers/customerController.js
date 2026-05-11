const prisma = require('../config/prisma');
const membershipService = require('../services/membershipService');

const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', membershipStatus } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let whereClause = { businessId: req.user.businessId };

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (membershipStatus === 'ACTIVE') {
      whereClause.memberships = {
        some: {
          status: 'ACTIVE',
          endAt: { gte: new Date() }
        }
      };
    } else if (membershipStatus === 'NONE') {
      whereClause.memberships = { none: {} };
    }

    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip,
        take,
        include: {
          _count: { select: { transactions: true } },
          transactions: {
            select: { startDate: true },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
          memberships: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              balances: {
                include: { service: { select: { id: true, name: true, unit: true } } },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      }),
      prisma.customer.count({ where: whereClause }),
    ]);

    const enriched = customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address,
      transactionCount: c._count.transactions,
      lastTransactionAt: c.transactions[0]?.startDate || null,
      membership: c.memberships[0]
        ? {
            id: c.memberships[0].id,
            templateId: c.memberships[0].templateId,
            status: c.memberships[0].status,
            startAt: c.memberships[0].startAt,
            endAt: c.memberships[0].endAt,
            isActive: c.memberships[0].status === 'ACTIVE' && new Date(c.memberships[0].endAt) >= new Date(),
            balances: c.memberships[0].balances.map((b) => ({
              serviceId: b.serviceId,
              serviceName: b.service.name,
              unit: b.service.unit,
              initialQty: b.initialQty,
              remainingQty: b.remainingQty,
            })),
          }
        : null,
      createdAt: c.createdAt,
    }));

    res.json({
      data: enriched,
      pagination: {
        totalItems: totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCustomer = async (req, res) => {
  const { name, phone, address } = req.body;
  try {
    const customer = await prisma.customer.upsert({
      where: {
        businessId_phone: {
          businessId: req.user.businessId,
          phone: phone || '',
        },
      },
      update: { name, address },
      create: {
        businessId: req.user.businessId,
        name,
        phone,
        address,
      },
    });
    res.status(201).json(customer);
  } catch (error) {
    try {
      const fallback = await prisma.customer.create({
        data: { businessId: req.user.businessId, name, phone, address },
      });
      res.status(201).json(fallback);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};

const createCustomerWithMembership = async (req, res) => {
  const { name, phone, address, startAt, templateId } = req.body;
  if (!name) return res.status(400).json({ message: 'Nama customer wajib diisi' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      let customer = null;
      if (phone) {
        customer = await tx.customer.upsert({
          where: {
            businessId_phone: {
              businessId: req.user.businessId,
              phone,
            },
          },
          update: { name, address },
          create: { businessId: req.user.businessId, name, phone, address },
        });
      } else {
        customer = await tx.customer.create({
          data: { businessId: req.user.businessId, name, phone: null, address },
        });
      }
      await membershipService.activateCustomerMembership({
        businessId: req.user.businessId,
        customerId: customer.id,
        templateId,
        startAt,
        tx,
      });
      return customer;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { name, phone, address } = req.body;
  try {
    const customer = await prisma.customer.update({
      where: { id, businessId: req.user.businessId },
      data: { name, phone, address },
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const activateMembership = async (req, res) => {
  const { id } = req.params;
  const { startAt, templateId } = req.body;
  try {
    const customer = await prisma.customer.findFirst({
      where: { id, businessId: req.user.businessId },
    });
    if (!customer) return res.status(404).json({ message: 'Customer tidak ditemukan' });

    await membershipService.activateCustomerMembership({
      businessId: req.user.businessId,
      customerId: id,
      templateId,
      startAt,
    });
    res.json({ message: 'Membership berhasil diaktifkan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMembershipUsage = async (req, res) => {
  const { id } = req.params;
  try {
    const membership = await prisma.customerMembership.findFirst({
      where: { id, businessId: req.user.businessId },
      include: {
        usageLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            service: { select: { name: true, unit: true } },
            transaction: { select: { id: true, customerName: true, startDate: true } },
          },
          take: 100,
        },
        balances: {
          include: { service: { select: { name: true, unit: true } } },
        },
      },
    });
    if (!membership) return res.status(404).json({ error: 'Membership tidak ditemukan' });
    res.json(membership);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Hanya OWNER yang dapat menghapus data pelanggan' });
  }
  try {
    await prisma.customer.delete({
      where: { id, businessId: req.user.businessId },
    });
    res.json({ message: 'Pelanggan dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus pelanggan, transaksi mungkin masih tertaut.' });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  createCustomerWithMembership,
  updateCustomer,
  activateMembership,
  getMembershipUsage,
  deleteCustomer,
};
