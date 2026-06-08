const { DomainError } = require('../utils/domainError');

const STAFF_ALWAYS_MENUS = new Set(['CASHIER', 'TRACKING']);

const MENU_FLAG_MAP = {
  DASHBOARD: 'allowStaffDashboard',
  CUSTOMERS: 'allowStaffCustomers',
  SERVICES: 'allowStaffServices',
  REPORTS: 'allowStaffReports',
};

/**
 * Middleware: cek permission staff berdasarkan BusinessSetting.
 * OWNER selalu lolos. STAFF dicek flag menu yang relevan.
 *
 * @param {string} menu - DASHBOARD | CUSTOMERS | SERVICES | REPORTS | CASHIER | TRACKING
 * @param {{ write?: boolean }} options - write:true untuk mutasi; DASHBOARD/REPORTS read-only
 */
const requireStaffPermission = (menu, { write = false } = {}) => {
  return async (req, res, next) => {
    if (req.user?.role === 'OWNER') return next();

    if (req.user?.role !== 'STAFF') {
      return res.status(403).json({
        message: 'Akses ditolak',
        code: 'STAFF_PERMISSION_DENIED',
      });
    }

    if (STAFF_ALWAYS_MENUS.has(menu)) return next();

    if (write && ['DASHBOARD', 'REPORTS'].includes(menu)) {
      return res.status(403).json({
        message: 'Staff hanya dapat melihat data ini',
        code: 'STAFF_PERMISSION_DENIED',
      });
    }

    const flag = MENU_FLAG_MAP[menu];
    if (!flag) {
      return res.status(403).json({
        message: 'Anda tidak memiliki izin untuk aksi ini',
        code: 'STAFF_PERMISSION_DENIED',
      });
    }

    const prisma = require('../config/prisma');
    const setting = await prisma.businessSetting.findUnique({
      where: { businessId: req.user.businessId },
    });

    if (!setting?.[flag]) {
      return res.status(403).json({
        message: 'Anda tidak memiliki izin untuk aksi ini',
        code: 'STAFF_PERMISSION_DENIED',
      });
    }

    next();
  };
};

/** Hanya OWNER — subscription, staff, settings, whatsapp config, dll. */
const requireOwner = () => (req, res, next) => {
  if (req.user?.role !== 'OWNER') {
    return res.status(403).json({
      message: 'Hanya OWNER yang dapat melakukan aksi ini',
      code: 'STAFF_PERMISSION_DENIED',
    });
  }
  next();
};

/** Semua staff terautentikasi (operasional kasir: GET services/customers). */
const requireAnyStaff = () => (req, res, next) => {
  if (req.user?.role === 'OWNER' || req.user?.role === 'STAFF') return next();
  return res.status(403).json({
    message: 'Akses ditolak',
    code: 'STAFF_PERMISSION_DENIED',
  });
};

module.exports = { requireStaffPermission, requireOwner, requireAnyStaff, STAFF_ALWAYS_MENUS };
