const prisma = require('../config/prisma');

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build filter query
    let whereClause = {
      businessId: req.user.businessId
    };

    if (search) {
      whereClause.OR = [
        { customerName: { contains: search } },
        { serviceName: { contains: search } },
        { status: { contains: search } },
      ];
    }

    if (startDate && endDate) {
      whereClause.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { startDate: 'desc' },
        skip,
        take
      }),
      prisma.transaction.count({ where: whereClause })
    ]);

    res.json({
      data: transactions,
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

const createTransaction = async (req, res) => {
  const { customerName, customerPhone, customerAddress, serviceName, weight, totalPrice, paymentMethod } = req.body;
  try {
    let customerId = null;

    // Auto-save Customer List
    if (customerName) {
      try {
        const customer = await prisma.customer.upsert({
          where: { 
            businessId_phone: {
              businessId: req.user.businessId,
              phone: customerPhone || ''
            }
          },
          update: { name: customerName, address: customerAddress },
          create: {
            businessId: req.user.businessId,
            name: customerName,
            phone: customerPhone || '',
            address: customerAddress
          }
        });
        customerId = customer.id;
      } catch (e) {
        // Abaikan jika duplikat atau tanpa nomor, karena phone nullable tapi required by unique constraint. 
        // Jika phone null, Prisma upsert butuh trick. Karena phone di unique butuh value.
        // Coba cari & create manual bila gagal
        const fallback = await prisma.customer.create({
          data: {
             businessId: req.user.businessId,
             name: customerName,
             phone: customerPhone || null,
             address: customerAddress
          }
        }).catch(()=>null);
        if(fallback) customerId = fallback.id;
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        businessId: req.user.businessId,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        serviceName,
        weight: parseFloat(weight),
        totalPrice: parseInt(totalPrice),
        paymentMethod: paymentMethod || 'CASH',
        status: 'PENDING'
      }
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const transaction = await prisma.transaction.update({
      where: { id, businessId: req.user.businessId },
      data: { status }
    });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getTransactions, createTransaction, updateStatus };
