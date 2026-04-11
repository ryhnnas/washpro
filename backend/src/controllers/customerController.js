const prisma = require('../config/prisma');

const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let whereClause = {
      businessId: req.user.businessId
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip,
        take
      }),
      prisma.customer.count({ where: whereClause })
    ]);

    res.json({
      data: customers,
      pagination: {
        totalItems: totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take)
      }
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
          phone: phone || ''
        }
      },
      update: { name, address },
      create: {
        businessId: req.user.businessId,
        name,
        phone,
        address
      }
    });
    res.status(201).json(customer);
  } catch (error) {
    // Upsert might fail if phone is null, let's catch it
    try {
      const fallback = await prisma.customer.create({
        data: {
          businessId: req.user.businessId,
          name, phone, address
        }
      });
      res.status(201).json(fallback);
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  }
};

const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { name, phone, address } = req.body;
  try {
    const customer = await prisma.customer.update({
      where: { id, businessId: req.user.businessId },
      data: { name, phone, address }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.customer.delete({
      where: { id, businessId: req.user.businessId }
    });
    res.json({ message: "Pelanggan dihapus" });
  } catch (error) {
    res.status(500).json({ error: "Gagal menghapus pelanggan, transaksi mungkin masih tertaut." });
  }
};

module.exports = { getCustomers, createCustomer, updateCustomer, deleteCustomer };
