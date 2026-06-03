import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Fetch CSRF token on app init (sets cookie for subsequent requests)
  useEffect(() => {
    authService.initCsrf();
  }, []);

  const login = useCallback((token, userData) => {
    // Token masih disimpan di localStorage untuk backward compat (misal mobile app)
    // Tapi browser utama menggunakan httpOnly cookie yang di-set oleh server
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    try {
      await authService.logout();
    } catch {
      // Fallback: redirect even if server call fails
      window.location.href = '/';
    }
  }, []);

  /**
   * Update sebagian data user (misal setelah update profil).
   * Sync ke localStorage sekaligus.
   */
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
