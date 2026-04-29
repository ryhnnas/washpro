const prisma = require('../config/prisma');
const whatsappService = require('../services/whatsappService');
const membershipService = require('../services/membershipService');

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let whereClause = { businessId: req.user.businessId };

    if (search) {
      whereClause.OR = [
        { customerName: { contains: search } },
        { serviceName: { contains: search } },
        { status: { contains: search } },
      ];
    }

    if (startDate && endDate) {
      whereClause.startDate = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const now = new Date();
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { startDate: 'desc' },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true } },
          customerMembership: { select: { id: true, endAt: true, status: true } },
        },
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    const enriched = transactions.map((t) => ({
      ...t,
      isOverdue: !!t.estimatedCompletionAt && ['PENDING', 'PROSES'].includes(t.status) && new Date(t.estimatedCompletionAt) < now,
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

const getOverdueTransactions = async (req, res) => {
  try {
    const now = new Date();
    const data = await prisma.transaction.findMany({
      where: {
        businessId: req.user.businessId,
        status: { in: ['PENDING', 'PROSES'] },
        estimatedCompletionAt: { lt: now },
      },
      orderBy: { estimatedCompletionAt: 'asc' },
      take: 200,
    });
    res.json({
      total: data.length,
      data: data.map((t) => ({
        ...t,
        isOverdue: true,
        overdueMinutes: Math.max(0, Math.floor((Date.now() - new Date(t.estimatedCompletionAt).getTime()) / 60000)),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createTransaction = async (req, res) => {
  const {
    customerName,
    customerPhone,
    customerAddress,
    serviceName,
    serviceId,
    weight,
    totalPrice,
    paymentMethod,
    items,
  } = req.body;
  try {
    const businessId = req.user.businessId;
    const total = parseInt(totalPrice, 10);

    const transaction = await prisma.$transaction(async (tx) => {
      let customer = null;
      if (customerName) {
        if (customerPhone) {
          const existingByPhone = await tx.customer.findUnique({
            where: {
              businessId_phone: { businessId, phone: customerPhone },
            },
          });

          if (existingByPhone) {
            // IMPORTANT:
            // Jangan overwrite nama customer existing saat transaksi kasir.
            // Sebelumnya ini bikin kasus "pelanggan baru" terlihat langsung jadi member
            // karena sebenarnya nomor HP mengarah ke customer lama yang sudah punya membership.
            customer = existingByPhone;
          } else {
            customer = await tx.customer.create({
              data: { businessId, name: customerName, phone: customerPhone, address: customerAddress },
            });
          }
        } else {
          customer = await tx.customer.create({
            data: { businessId, name: customerName, phone: null, address: customerAddress },
          });
        }
      }

      const requestedItems = Array.isArray(items) && items.length > 0
        ? items
        : [{ serviceId, serviceName, qty: weight }];

      const normalizedItems = requestedItems
        .map((item) => ({
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          qty: parseFloat(item.qty ?? item.weight),
        }))
        .filter((item) => item.qty && item.qty > 0);

      if (normalizedItems.length === 0) throw new Error('Minimal satu rincian layanan wajib diisi');

      const selectedServices = await Promise.all(
        normalizedItems.map(async (item) => {
          let svc = null;
          if (item.serviceId) svc = await tx.service.findFirst({ where: { id: item.serviceId, businessId } });
          if (!svc && item.serviceName) svc = await tx.service.findFirst({ where: { name: item.serviceName, businessId } });
          if (!svc) throw new Error(`Layanan tidak ditemukan: ${item.serviceName || item.serviceId}`);
          return { service: svc, qty: item.qty };
        })
      );
      const mergedByService = new Map();
      selectedServices.forEach(({ service, qty }) => {
        const key = service.id;
        const prev = mergedByService.get(key);
        if (prev) prev.qty += qty;
        else mergedByService.set(key, { service, qty });
      });
      const serviceEntries = Array.from(mergedByService.values());

      const activeMembership = await membershipService.findActiveMembership(businessId, customer?.id);
      const itemBreakdowns = serviceEntries.map(({ service, qty }) => {
        const coverage = membershipService.calculateCoverage({
          transactionQty: qty,
          servicePrice: service.price,
          activeMembership,
          serviceId: service.id,
        });
        const itemTotal = Math.round(qty * service.price);
        const coveredAmount = Math.min(itemTotal, coverage.coveredAmount);
        const payableAmount = Math.max(0, itemTotal - coveredAmount);
        return {
          serviceId: service.id,
          serviceName: service.name,
          unit: service.unit,
          qty,
          price: service.price,
          lineTotal: itemTotal,
          estimateValue: service.estimateValue || 24,
          estimateUnit: service.estimateUnit || 'HOUR',
          usedQty: coverage.usedQty,
          coveredAmount,
          payableAmount,
          reason: coverage.reason,
          isUsingMembership: coverage.isUsingMembership,
        };
      });

      const computedTotal = itemBreakdowns.reduce((sum, x) => sum + x.lineTotal, 0);
      const computedCovered = itemBreakdowns.reduce((sum, x) => sum + x.coveredAmount, 0);
      const computedPayable = itemBreakdowns.reduce((sum, x) => sum + x.payableAmount, 0);
      const finalTotal = Number.isFinite(total) ? total : computedTotal;
      const normalizedCovered = Math.min(finalTotal, computedCovered);
      const payable = Math.max(0, finalTotal - normalizedCovered);
      const maxEstimateHours = itemBreakdowns.reduce((max, item) => {
        const hours = item.estimateUnit === 'DAY' ? item.estimateValue * 24 : item.estimateValue;
        return Math.max(max, hours || 24);
      }, 24);
      const estimatedCompletionAt = new Date();
      estimatedCompletionAt.setHours(estimatedCompletionAt.getHours() + maxEstimateHours);

      const created = await tx.transaction.create({
        data: {
          businessId,
          customerId: customer?.id || null,
          customerMembershipId: activeMembership?.id || null,
          customerName,
          customerPhone,
          customerAddress,
          serviceName:
            itemBreakdowns.length === 1
              ? itemBreakdowns[0].serviceName
              : `Multi Layanan (${itemBreakdowns.length} item)`,
          weight: itemBreakdowns.reduce((sum, x) => sum + x.qty, 0),
          lineItems: itemBreakdowns.map((item) => ({
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            unit: item.unit,
            qty: item.qty,
            price: item.price,
            lineTotal: item.lineTotal,
            coveredAmount: item.coveredAmount,
            payableAmount: item.payableAmount,
          })),
          totalPrice: finalTotal,
          coveredAmount: normalizedCovered,
          payableAmount: payable,
          estimatedCompletionAt,
          isOverdue: false,
          paymentMethod: paymentMethod || 'CASH',
          status: 'PENDING',
        },
      });

      if (activeMembership?.id) {
        for (const item of itemBreakdowns) {
          if (!item.isUsingMembership || item.usedQty <= 0) continue;
          await membershipService.consumeQuotaAndLog({
            tx,
            businessId,
            membershipId: activeMembership.id,
            transactionId: created.id,
            serviceId: item.serviceId,
            usedQty: item.usedQty,
            coveredAmount: item.coveredAmount,
            payableAmount: item.payableAmount,
          });
        }
      }

      return {
        ...created,
        membershipBreakdown: {
          activeMembershipId: activeMembership?.id || null,
          reason: itemBreakdowns.some((i) => i.isUsingMembership) ? 'ITEM_LEVEL_COVERAGE' : 'NO_MEMBERSHIP',
          usedQty: itemBreakdowns.reduce((sum, x) => sum + (x.usedQty || 0), 0),
          coveredAmount: normalizedCovered,
          payableAmount: payable,
          items: itemBreakdowns,
        },
      };
    });

    // Kirim nota digital otomatis via GOWA. Tidak menghalangi response bila gagal.
    let waResult = { ok: false, skipped: true };
    if (transaction.customerPhone) {
      waResult = await whatsappService.sendReceipt({
        businessId: req.user.businessId,
        transaction,
      });
    }

    res.status(201).json({ ...transaction, whatsapp: waResult });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notify = true } = req.body;
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id, businessId: req.user.businessId },
    });
    if (!existing) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const data = { status };
    if (status === 'DIAMBIL') data.endDate = new Date();

    const transaction = await prisma.transaction.update({
      where: { id },
      data,
    });

    let waResult = { ok: false, skipped: true };
    if (notify && transaction.customerPhone) {
      waResult = await whatsappService.sendStatusUpdate({
        businessId: req.user.businessId,
        transaction,
      });
    }

    res.json({ ...transaction, whatsapp: waResult });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Endpoint manual: kirim ulang nota / pesan custom ke pelanggan transaksi
const resendReceipt = async (req, res) => {
  const { id } = req.params;
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id, businessId: req.user.businessId },
    });
    if (!transaction) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const result = await whatsappService.sendReceipt({
      businessId: req.user.businessId,
      transaction,
    });
    res.json({ message: 'Permintaan dikirim', whatsapp: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getTransactions, getOverdueTransactions, createTransaction, updateStatus, resendReceipt };
