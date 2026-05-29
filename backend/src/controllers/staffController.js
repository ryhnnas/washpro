const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

// Ambil daftar staff berdasarkan businessId dari user (owner) yang login
const getStaff = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const staffList = await prisma.user.findMany({
      where: {
        businessId: businessId,
        role: 'STAFF'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true
      }
    });
    res.json(staffList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buat akun staff baru (hanya bisa diakses owner)
const createStaff = async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    // Validasi apakah hanya OWNER yang bisa create
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ message: "Hanya Pemilik yang dapat menambah staf." });
    }

    const businessId = req.user.businessId;

    // Cek apakah email sudah terpakai (User.email sifatnya unique)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email sudah digunakan, silakan gunakan email lain." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'STAFF',
        businessId: businessId
      },
      select: { id: true, name: true, email: true, phone: true, createdAt: true }
    });

    res.status(201).json({ message: "Staf berhasil ditambahkan", data: newStaff });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Hapus staff
const deleteStaff = async (req, res) => {
  const { id } = req.params;
  try {
    // Validasi OWNER
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ message: "Akses ditolak. Bukan pemilik." });
    }

    const businessId = req.user.businessId;

    // Pastikan staff yg mau dihapus ada di bisnis yg sama
    const staff = await prisma.user.findFirst({
      where: { id: id, businessId: businessId, role: 'STAFF' }
    });

    if (!staff) {
      return res.status(404).json({ message: "Staf tidak ditemukan." });
    }

    await prisma.user.delete({
      where: { id: id }
    });

    res.json({ message: "Staf berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update staff (Hanya bisa diakses owner)
const updateStaff = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, phone } = req.body;
  try {
    // Validasi OWNER
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ message: "Akses ditolak. Bukan pemilik." });
    }

    const businessId = req.user.businessId;

    // Pastikan staff yg mau diupdate ada di bisnis yg sama
    const staff = await prisma.user.findFirst({
      where: { id: id, businessId: businessId, role: 'STAFF' }
    });

    if (!staff) {
      return res.status(404).json({ message: "Staf tidak ditemukan." });
    }

    const updateData = { name, email };
    
    // Jika password diisi, hash password baru
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update phone (bisa di-set atau di-clear)
    if (phone !== undefined) {
      updateData.phone = phone || null;
    }

    const updatedStaff = await prisma.user.update({
      where: { id: id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, updatedAt: true }
    });

    res.json({ message: "Staf berhasil diperbarui", data: updatedStaff });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getStaff, createStaff, deleteStaff, updateStaff };
