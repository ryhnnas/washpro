/**
 * Status yang berlaku saat super admin mengaktifkan kembali toko.
 * Tidak pernah mengembalikan ACTIVE tanpa masa aktif berbayar yang masih berjalan,
 * karena ACTIVE dengan subscriptionEndAt = null tidak pernah kedaluwarsa.
 */
const resolveReactivationStatus = (business, now = new Date()) => {
  if (business.deletedAt) return { ok: false, code: 'BUSINESS_DELETED' };

  if (business.subscriptionEndAt && business.subscriptionEndAt > now) {
    return { ok: true, status: 'ACTIVE' };
  }
  if (!business.subscriptionEndAt && business.trialEndAt && business.trialEndAt > now) {
    return { ok: true, status: 'TRIAL' };
  }
  return { ok: true, status: 'EXPIRED' };
};

module.exports = { resolveReactivationStatus };
