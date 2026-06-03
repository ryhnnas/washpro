import axios from 'axios';

// Instance axios khusus SuperAdmin (menggunakan token berbeda)
const superAdminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

superAdminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('superadmin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default superAdminApi;
