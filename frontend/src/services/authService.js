import api from '../lib/axios';

export const authService = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  verifyOtp: async (email, otp) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },
  verifyEmailOtp: async (email, otp) => {
    const response = await api.post('/auth/verify-email-otp', { email, otp });
    return response.data;
  },
  resendEmailOtp: async (email) => {
    const response = await api.post('/auth/resend-email-otp', { email });
    return response.data;
  },
  resetPassword: async (resetToken, newPassword) => {
    const response = await api.post('/auth/reset-password', { resetToken, newPassword });
    return response.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort: even if server call fails, clear local state
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },
  // Fetch CSRF token on app init
  initCsrf: async () => {
    try {
      await api.get('/auth/csrf-token');
    } catch {
      // Non-blocking: CSRF cookie will be set on login anyway
    }
  },
};
