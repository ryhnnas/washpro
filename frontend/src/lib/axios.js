import axios from 'axios';

// Konfigurasi default Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor Request: Sisipkan Token JWT ke Authorization Header setiap kali request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor Response: Handle token expired dan subscription expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) return Promise.reject(error);

    const { status, data } = error.response;
    const currentPath = window.location.pathname;

    // 401: token invalid/expired → bersihkan storage + redirect ke login
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const publicPaths = ['/login', '/register', '/', '/superadmin/login'];
      if (!publicPaths.includes(currentPath)) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // 403 dengan subscriptionStatus: subscription issue → redirect ke paywall
    if (status === 403 && data?.subscriptionStatus) {
      const subscriptionPaths = ['/paywall', '/subscription'];
      if (!subscriptionPaths.some((p) => currentPath.startsWith(p))) {
        window.location.href = '/paywall';
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
