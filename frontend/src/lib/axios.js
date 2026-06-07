import axios from 'axios';

// Helper: baca cookie by name
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// Konfigurasi default Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Kirim cookies (httpOnly auth_token + csrf_token) di setiap request
});

// Flag untuk mencegah multiple refresh requests bersamaan
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Interceptor Request: Sisipkan CSRF token + fallback Authorization header
api.interceptors.request.use(
  (config) => {
    // CSRF token dari cookie (double-submit pattern)
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // Fallback: jika masih ada token di localStorage (backward compat / transisi)
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

// Interceptor Response: Handle token refresh, CSRF errors, subscription expired
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) return Promise.reject(error);

    const { status, data } = error.response;
    const originalRequest = error.config;
    const currentPath = window.location.pathname;

    // 401: Access token expired → coba refresh
    if (status === 401 && !originalRequest._retry) {
      // Jangan refresh jika ini sudah request ke /auth/refresh atau /auth/login
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const publicPaths = ['/login', '/register', '/', '/superadmin/login'];
        if (!publicPaths.includes(currentPath)) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue request sampai refresh selesai
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Retry dengan CSRF token baru
          const csrfToken = getCookie('csrf_token');
          if (csrfToken) originalRequest.headers['X-CSRF-Token'] = csrfToken;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await api.post('/auth/refresh');
        const newToken = refreshRes.data?.token;

        // Update localStorage untuk backward compat
        if (newToken) localStorage.setItem('token', newToken);
        if (refreshRes.data?.user) localStorage.setItem('user', JSON.stringify(refreshRes.data.user));

        processQueue(null, newToken);

        // Retry original request
        const csrfToken = getCookie('csrf_token');
        if (csrfToken) originalRequest.headers['X-CSRF-Token'] = csrfToken;
        if (newToken) originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const publicPaths = ['/login', '/register', '/', '/superadmin/login'];
        if (!publicPaths.includes(currentPath)) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 dengan CSRF error → refresh CSRF token dan retry
    if (status === 403 && (data?.code === 'CSRF_MISSING' || data?.code === 'CSRF_INVALID') && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      try {
        await api.get('/auth/csrf-token');
        const csrfToken = getCookie('csrf_token');
        if (csrfToken) originalRequest.headers['X-CSRF-Token'] = csrfToken;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    // 403 dengan subscriptionStatus: subscription issue → redirect ke paywall
    if (status === 403 && data?.subscriptionStatus) {
      if (data.subscriptionStatus === 'SUSPENDED') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!currentPath.startsWith('/login')) {
          window.location.href = '/login?suspended=1';
        }
        return Promise.reject(error);
      }
      const subscriptionPaths = ['/paywall', '/subscription'];
      if (!subscriptionPaths.some((p) => currentPath.startsWith(p))) {
        window.location.href = '/paywall';
      }
      return Promise.reject(error);
    }

    if (status === 403 && data?.code === 'STAFF_ONBOARDING_REQUIRED') {
      if (!currentPath.startsWith('/staff-onboarding')) {
        window.location.href = '/staff-onboarding';
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
