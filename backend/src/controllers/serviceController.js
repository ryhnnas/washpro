const prisma = require('../config/prisma');

// Ambil semua layanan milik suatu Business
const getServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { businessId: req.user.businessId }
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createService = async (req, res) => {
  const { name, price, type, unit, estimateValue, estimateUnit } = req.body;
  try {
    const service = await prisma.service.create({
      data: {
        businessId: req.user.businessId,
        name,
        price,
        type,
        unit,
        estimateValue: estimateValue ? parseInt(estimateValue, 10) : 24,
        estimateUnit: estimateUnit || 'HOUR',
      }
    });
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateService = async (req, res) => {
  const { id } = req.params;
  const { name, price, type, unit, estimateValue, estimateUnit } = req.body;
  try {
    const service = await prisma.service.update({
      where: { id, businessId: req.user.businessId },
      data: {
        name,
        price,
        type,
        unit,
        estimateValue: estimateValue ? parseInt(estimateValue, 10) : undefined,
        estimateUnit: estimateUnit || undefined,
      }
    });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.service.delete({
      where: { id, businessId: req.user.businessId }
    });
    res.json({ message: "Layanan berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ error: "Layanan ini sudah memiliki riwayat transaksi, tidak bisa dihapus." });
  }
};

module.exports = { getServices, createService, updateService, deleteService };
