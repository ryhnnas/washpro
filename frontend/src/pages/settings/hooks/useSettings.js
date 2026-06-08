import { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/axios';
import { DEFAULT_TEMPLATES } from '../constants';

const INITIAL_SETTINGS = {
  requireCustomerName: true,
  requireCustomerPhone: true,
  requireCustomerAddress: false,
  staffAllowedMenus: ['CASHIER', 'TRACKING'],
  whatsappEnabled: false,
  whatsappApiUrl: 'http://localhost:3000',
  whatsappUsername: 'admin',
  whatsappPassword: '',
  whatsappSenderName: '',
  membershipPackages: [],
  whatsappTemplates: { ...DEFAULT_TEMPLATES },
  businessName: '',
  businessAddress: '',
  businessPhone: '',
  whatsappNotificationStates: ['PENDING', 'SELESAI'],
};

export function useSettings() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/settings'), api.get('/services')])
      .then(([settingsRes, serviceRes]) => {
        setServices(serviceRes.data || []);
        const res = settingsRes;
        if (res.data) {
          let staffMenus = ['CASHIER', 'TRACKING'];
          try {
            staffMenus = JSON.parse(res.data.staffAllowedMenus || '[]');
          } catch {
            /* ignore invalid JSON */
          }
          const dbTemplates = res.data.whatsappTemplates || {};
          const mergedTemplates = {};
          Object.keys(DEFAULT_TEMPLATES).forEach((key) => {
            mergedTemplates[key] = dbTemplates[key] || DEFAULT_TEMPLATES[key];
          });
          setSettings((prev) => ({
            ...prev,
            ...res.data,
            staffAllowedMenus: staffMenus,
            whatsappTemplates: mergedTemplates,
            membershipPackages: res.data.membershipPackages || [],
            whatsappNotificationStates: res.data.whatsappNotificationStates || ['PENDING', 'SELESAI'],
          }));
        }
      })
      .catch((err) => {
        console.error(err);
        setLoadError('Gagal memuat pengaturan.');
      });
  }, []);

  const handleMenuToggle = useCallback((menuId) => {
    setSettings((prev) => {
      const menus = [...prev.staffAllowedMenus];
      if (menus.includes(menuId)) {
        return { ...prev, staffAllowedMenus: menus.filter((m) => m !== menuId) };
      }
      return { ...prev, staffAllowedMenus: [...menus, menuId] };
    });
  }, []);

  const handleSave = useCallback(async () => {
    setLoading(true);
    setSaved(false);
    try {
      const payload = {
        ...settings,
        membershipPackages: settings.membershipPackages.map((pkg) => ({
          ...pkg,
          items: pkg.items.map((i) => ({
            serviceId: i.serviceId,
            quotaAmount: Number(i.quotaAmount) || 0,
            deductionRate: Number(i.deductionRate) || 1,
          })),
        })),
      };
      const res = await api.put('/settings', payload);
      if (res.data.whatsappTemplates) {
        setSettings((prev) => ({
          ...prev,
          whatsappTemplates: res.data.whatsappTemplates,
        }));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  }, [settings]);

  const addPackage = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      membershipPackages: [
        ...prev.membershipPackages,
        { name: 'Paket Baru', durationDays: 30, items: [] },
      ],
    }));
  }, []);

  const removePackage = useCallback((pIdx) => {
    setSettings((prev) => ({
      ...prev,
      membershipPackages: prev.membershipPackages.filter((_, i) => i !== pIdx),
    }));
  }, []);

  const updatePackage = useCallback((pIdx, data) => {
    setSettings((prev) => {
      const pkgs = [...prev.membershipPackages];
      pkgs[pIdx] = { ...pkgs[pIdx], ...data };
      return { ...prev, membershipPackages: pkgs };
    });
  }, []);

  const addPackageItem = useCallback((pIdx) => {
    setSettings((prev) => {
      const pkgs = [...prev.membershipPackages];
      pkgs[pIdx].items = [...pkgs[pIdx].items, { serviceId: '', quotaAmount: 0, deductionRate: 1 }];
      return { ...prev, membershipPackages: pkgs };
    });
  }, []);

  const removePackageItem = useCallback((pIdx, iIdx) => {
    setSettings((prev) => {
      const pkgs = [...prev.membershipPackages];
      pkgs[pIdx].items = pkgs[pIdx].items.filter((_, i) => i !== iIdx);
      return { ...prev, membershipPackages: pkgs };
    });
  }, []);

  const updatePackageItem = useCallback((pIdx, iIdx, data) => {
    setSettings((prev) => {
      const pkgs = [...prev.membershipPackages];
      pkgs[pIdx].items[iIdx] = { ...pkgs[pIdx].items[iIdx], ...data };
      return { ...prev, membershipPackages: pkgs };
    });
  }, []);

  return {
    settings,
    setSettings,
    services,
    loading,
    saved,
    loadError,
    setLoadError,
    handleMenuToggle,
    handleSave,
    addPackage,
    removePackage,
    updatePackage,
    addPackageItem,
    removePackageItem,
    updatePackageItem,
  };
}
