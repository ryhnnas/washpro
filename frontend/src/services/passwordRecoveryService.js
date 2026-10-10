import api from '../lib/axios';
import superAdminApi from '../lib/superAdminAxios';

export const getPasswordRecoveryService = (superAdmin = false) => {
  const client = superAdmin ? superAdminApi : api;
  const path = superAdmin ? '/superadmin' : '/auth';
  return {
    forgotPassword: async (email) => (await client.post(`${path}/forgot-password`, { email })).data,
    verifyOtp: async (email, otp) => (await client.post(`${path}/verify-otp`, { email, otp })).data,
    resetPassword: async (resetToken, newPassword) => (await client.post(`${path}/reset-password`, { resetToken, newPassword })).data,
  };
};
