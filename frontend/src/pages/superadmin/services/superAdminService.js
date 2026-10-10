import superAdminApi from '../../../lib/superAdminAxios';

export const superAdminService = {
  getSession: () => superAdminApi.get('/superadmin/me'),
  logout: () => superAdminApi.post('/superadmin/logout'),
  getStats: () => superAdminApi.get('/superadmin/stats'),
  getBusinesses: (params) => superAdminApi.get('/superadmin/businesses', { params }),
  getPayments: (params) => superAdminApi.get('/superadmin/payments', { params }),
  getPlans: () => superAdminApi.get('/superadmin/plans'),
  approvePayment: (id) => superAdminApi.post(`/superadmin/payments/${id}/approve`),
  rejectPayment: (id, reason) => superAdminApi.post(`/superadmin/payments/${id}/reject`, { reason }),
  toggleBusiness: (id, action) => superAdminApi.post(`/superadmin/businesses/${id}/toggle`, { action }),
  deleteBusiness: (id, confirmName) => superAdminApi.delete(`/superadmin/businesses/${id}`, { data: { confirmName } }),
  savePlan: (payload) => superAdminApi.post('/superadmin/plans', payload),
};
