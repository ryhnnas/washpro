import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/axios';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);
export function AppProvider({ children }) {
  const { user } = useAuth();
  const [settingsRecord, setSettingsRecord] = useState({});
  const [subscriptionRecord, setSubscriptionRecord] = useState({});
  const settingsRequest = useRef(0);
  const subscriptionRequest = useRef(0);
  const fetchSettings = useCallback(async () => {
    if (!user) return;
    const id = ++settingsRequest.current;
    setSettingsRecord(prev => ({ userId: user.id, data: prev.userId === user.id ? prev.data : null, loading: true, error: '' }));
    try {
      const response = await api.get(user.role === 'OWNER' ? '/settings' : '/settings/public');
      if (id === settingsRequest.current) setSettingsRecord({ userId: user.id, data: response.data, loading: false, error: '' });
    } catch (err) {
      if (id === settingsRequest.current) setSettingsRecord({ userId: user.id, data: null, loading: false,
        error: err.response?.data?.message || 'Gagal memuat pengaturan.' });
    }
  }, [user]);
  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    const id = ++subscriptionRequest.current;
    try {
      const response = await api.get('/subscriptions/status');
      if (id === subscriptionRequest.current) setSubscriptionRecord({ userId: user.id, data: response.data });
    } catch { /* Subscription failures are handled by protected API requests. */ }
  }, [user]);
  useEffect(() => {
    const timer = setTimeout(() => { if (user) { void fetchSettings(); void fetchSubscription(); } }, 0);
    return () => { clearTimeout(timer); settingsRequest.current += 1; subscriptionRequest.current += 1; };
  }, [user, fetchSettings, fetchSubscription]);
  const settings = user && settingsRecord.userId === user.id ? settingsRecord.data : null;
  const settingsError = user && settingsRecord.userId === user.id ? settingsRecord.error || '' : '';
  const settingsLoading = !!user && (settingsRecord.userId !== user.id || !!settingsRecord.loading);
  const subscription = user && subscriptionRecord.userId === user.id ? subscriptionRecord.data : null;
  return <AppContext.Provider value={{ settings, subscription, settingsLoading, settingsError,
    refreshSettings: fetchSettings, refreshSubscription: fetchSubscription }}>{children}</AppContext.Provider>;
}
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
