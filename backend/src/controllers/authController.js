const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// LOGIC REGISTER
const registerOwner = async (req, res) => {
  const { businessName, ownerName, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({ data: { name: businessName } });
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email,
          password: hashedPassword,
          role: 'OWNER',
          businessId: business.id
        }
      });
      
      // Buat Pengaturan Bisnis Default
      await tx.businessSetting.create({
        data: {
          businessId: business.id,
          allowStaffCustomers: true, // Default staff bisa akses pelanggan
          allowStaffDashboard: false,
          allowStaffServices: false,
          allowStaffReports: false,
          allowStaffSettings: false
        }
      });

      // Buat Layanan Default Kiloan
      const defaultServices = [
        { name: 'Setrika', price: 4000, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Kering Parfum', price: 5000, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Standar 3 Hari', price: 6500, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Reguler 2 Hari', price: 7500, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Express 1 Hari', price: 9000, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Kilat 12 Jam', price: 12000, type: 'KILOAN', unit: 'kg' },
        { name: 'Cuci Kilat 6 Jam', price: 15000, type: 'KILOAN', unit: 'kg' },
        // Layanan Satuan
        { name: 'Bedcover', price: 25000, type: 'SATUAN', unit: 'pcs' },
        { name: 'Selimut', price: 15000, type: 'SATUAN', unit: 'pcs' },
        { name: 'Seprai Set', price: 10000, type: 'SATUAN', unit: 'pcs' },
        { name: 'Boneka', price: 20000, type: 'SATUAN', unit: 'pcs' },
        { name: 'Karpet', price: 15000, type: 'SATUAN', unit: 'm2' },
        { name: 'Sepatu', price: 20000, type: 'SATUAN', unit: 'pasang' }
      ].map(s => ({ ...s, businessId: business.id }));

      await tx.service.createMany({ data: defaultServices });

      return { business, user };
    });
    res.status(201).json({ message: "Registrasi Berhasil", data: result });
  } catch (error) {
    res.status(400).json({ error: "Email sudah terdaftar atau data tidak valid" });
  }
};

// LOGIC LOGIN
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });



    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Password salah" });

    // Buat Token JWT dengan menyisipkan businessId
    const token = jwt.sign(
      { id: user.id, businessId: user.businessId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: "Login Berhasil",
      token,
      user: { id: user.id, name: user.name, role: user.role, businessId: user.businessId }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateProfile = async (req, res) => {
  const { name, password } = req.body;
  const userId = req.user.id;

  try {
    const data = {};
    if (name) data.name = name;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    res.json({
      message: "Profil berhasil diperbarui",
      user: { id: updatedUser.id, name: updatedUser.name, role: updatedUser.role, businessId: updatedUser.businessId }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registerOwner, login, updateProfile };