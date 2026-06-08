import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      await authService.initCsrf();
      try {
        const session = await authService.getSession();
        setUser(session.user);
        localStorage.setItem('user', JSON.stringify(session.user));
      } catch {
        try {
          const refreshed = await authService.refreshSession();
          setUser(refreshed.user);
          localStorage.setItem('user', JSON.stringify(refreshed.user));
        } catch {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setUser(null);
        }
      } finally {
        setIsAuthLoading(false);
      }
    };

    bootstrapSession();
  }, []);

  const login = useCallback((userData) => {
    localStorage.removeItem('token');
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    try {
      await authService.logout();
    } catch {
      window.location.href = '/';
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
