export const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

export const STATUS_BADGE = {
  TRIAL: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  ACTIVE: 'bg-green-500/20 text-green-300 border-green-400/30',
  PENDING_PAYMENT: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  EXPIRED: 'bg-red-500/20 text-red-300 border-red-400/30',
  SUSPENDED: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
};

export const STATUS_LABEL = {
  TRIAL: 'Trial',
  ACTIVE: 'Aktif',
  PENDING_PAYMENT: 'Menunggu',
  EXPIRED: 'Kadaluarsa',
  SUSPENDED: 'Ditangguhkan',
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'payments', label: 'Pembayaran' },
  { id: 'businesses', label: 'Toko' },
  { id: 'plans', label: 'Paket' },
  { id: 'whatsapp', label: 'WA Superadmin' },
];
