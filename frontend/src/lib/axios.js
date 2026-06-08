import axios from 'axios';

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) return Promise.reject(error);

    const { status, data } = error.response;
    const originalRequest = error.config;
    const currentPath = window.location.pathname;

    if (status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        const publicPaths = ['/login', '/register', '/', '/superadmin/login'];
        if (!publicPaths.includes(currentPath)) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          const csrfToken = getCookie('csrf_token');
          if (csrfToken) originalRequest.headers['X-CSRF-Token'] = csrfToken;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await api.post('/auth/refresh');
        if (refreshRes.data?.user) {
          localStorage.setItem('user', JSON.stringify(refreshRes.data.user));
        }

        processQueue(null);

        const csrfToken = getCookie('csrf_token');
        if (csrfToken) originalRequest.headers['X-CSRF-Token'] = csrfToken;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        const publicPaths = ['/login', '/register', '/', '/superadmin/login'];
        if (!publicPaths.includes(currentPath)) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

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
