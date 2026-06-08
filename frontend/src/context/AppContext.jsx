import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/axios';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setSettingsLoading(true);
    try {
      if (user.role === 'OWNER') {
        // OWNER mendapat full settings (termasuk WA templates, dll)
        const res = await api.get('/settings');
        setSettings(res.data);
      } else {
        // STAFF mendapat public settings (form requirements, menu visibility, membership packages)
        const res = await api.get('/settings/public');
        setSettings(res.data);
      }
    } catch (err) {
      console.error('[AppContext] Gagal load settings:', err?.response?.status);
    } finally {
      setSettingsLoading(false);
    }
  }, [user]);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/subscriptions/status');
      setSubscription(res.data);
    } catch {
      // Jangan crash jika gagal (misal subscription belum ada)
    }
  }, [user]);

  const refreshSettings = useCallback(() => fetchSettings(), [fetchSettings]);
  const refreshSubscription = useCallback(() => fetchSubscription(), [fetchSubscription]);

  // Fetch saat user berubah (login/logout)
  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchSubscription();
    } else {
      // Reset saat logout
      setSettings(null);
      setSubscription(null);
    }
  }, [user, fetchSettings, fetchSubscription]);

  return (
    <AppContext.Provider value={{
      settings,
      subscription,
      settingsLoading,
      refreshSettings,
      refreshSubscription,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
