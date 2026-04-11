const prisma = require('../config/prisma');

const getSettings = async (req, res) => {
  try {
    let setting = await prisma.businessSetting.findUnique({
      where: { businessId: req.user.businessId }
    });
    // Jika belum ada, buat string kosong atau default
    if (!setting) {
      setting = await prisma.businessSetting.create({
        data: {
          businessId: req.user.businessId,
          staffAllowedMenus: JSON.stringify(["CASHIER", "TRACKING"])
        }
      });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateSettings = async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ message: "Hanya OWNER yang bisa mengubah pengaturan" });
  }

  const { requireCustomerName, requireCustomerPhone, requireCustomerAddress, staffAllowedMenus } = req.body;
  
  try {
    const setting = await prisma.businessSetting.upsert({
      where: { businessId: req.user.businessId },
      update: {
        requireCustomerName,
        requireCustomerPhone,
        requireCustomerAddress,
        staffAllowedMenus: JSON.stringify(staffAllowedMenus) // Simpan list array sebagai string JSON
      },
      create: {
        businessId: req.user.businessId,
        requireCustomerName,
        requireCustomerPhone,
        requireCustomerAddress,
        staffAllowedMenus: JSON.stringify(staffAllowedMenus || ["CASHIER", "TRACKING"])
      }
    });

    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getSettings, updateSettings };
