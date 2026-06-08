import { Save, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from './settings/hooks/useSettings';
import BusinessProfileSection from './settings/sections/BusinessProfileSection';
import CashierFormSection from './settings/sections/CashierFormSection';
import StaffAccessSection from './settings/sections/StaffAccessSection';
import NotificationSection from './settings/sections/NotificationSection';
import WhatsAppGatewaySection from './settings/sections/WhatsAppGatewaySection';
import TemplateSection from './settings/sections/TemplateSection';
import MembershipSection from './settings/sections/MembershipSection';

export default function Settings() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const {
    settings,
    setSettings,
    services,
    loading,
    saved,
    loadError,
    handleMenuToggle,
    handleSave,
    addPackage,
    removePackage,
    updatePackage,
    addPackageItem,
    removePackageItem,
    updatePackageItem,
  } = useSettings();

  return (
    <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tight mb-2">Preferensi Sistem</h1>
        <p className="text-slate-500 font-medium">Kustomisasi alur kasir, gateway WhatsApp, dan paket membership kuota.</p>
      </div>

      {loadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium" role="alert" aria-live="polite">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BusinessProfileSection settings={settings} setSettings={setSettings} />
        <CashierFormSection settings={settings} setSettings={setSettings} />
        <StaffAccessSection settings={settings} handleMenuToggle={handleMenuToggle} />

        {isOwner && (
          <>
            <NotificationSection settings={settings} setSettings={setSettings} />
            <WhatsAppGatewaySection />
            <TemplateSection settings={settings} setSettings={setSettings} />
            <MembershipSection
              settings={settings}
              services={services}
              addPackage={addPackage}
              removePackage={removePackage}
              updatePackage={updatePackage}
              addPackageItem={addPackageItem}
              removePackageItem={removePackageItem}
              updatePackageItem={updatePackageItem}
            />
          </>
        )}

        <div className="lg:col-span-2 flex justify-end mt-4 border-t border-slate-200 pt-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            aria-live="polite"
            className={`w-full md:w-auto px-10 py-4 font-black rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${saved ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/30' : 'bg-tertiary hover:bg-tertiary-hover text-primary shadow-tertiary/25 active:scale-95'}`}
          >
            {saved ? <Check size={20} aria-hidden="true" /> : <Save size={20} aria-hidden="true" />}
            {loading ? 'Menyimpan Konfigurasi...' : saved ? 'Tersimpan' : 'Terapkan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}
