import { useState, useEffect } from 'react';
import { Save, ShieldAlert, Sliders, Check } from 'lucide-react';
import api from '../lib/axios';

export default function Settings() {
  const [settings, setSettings] = useState({
    requireCustomerName: true,
    requireCustomerPhone: true,
    requireCustomerAddress: false,
    staffAllowedMenus: ["CASHIER", "TRACKING"]
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then((res) => {
      if(res.data) {
        setSettings({
          requireCustomerName: res.data.requireCustomerName,
          requireCustomerPhone: res.data.requireCustomerPhone,
          requireCustomerAddress: res.data.requireCustomerAddress,
          staffAllowedMenus: JSON.parse(res.data.staffAllowedMenus || '[]')
        });
      }
    }).catch(console.error);
  }, []);

  const handleMenuToggle = (menuId) => {
    setSettings(prev => {
      const menus = [...prev.staffAllowedMenus];
      if (menus.includes(menuId)) {
         return { ...prev, staffAllowedMenus: menus.filter(m => m !== menuId) };
      } else {
         return { ...prev, staffAllowedMenus: [...menus, menuId] };
      }
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      await api.put('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menyimpan");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tight mb-2">Preferensi Sistem</h1>
        <p className="text-slate-500 font-medium">Kustomisasi alur kasir dan konfigurasi keamanan Hak Akses (RBAC).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CUSTOM INPUT KASIR */}
        <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-tertiary relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
             <div className="p-3 bg-tertiary/20 rounded-xl text-tertiary-hover"><Sliders size={24}/></div>
             <div>
               <h2 className="text-xl font-black text-primary">Form Kasir</h2>
               <p className="text-xs text-slate-500 font-bold">Bongkar pasang identitas pelanggan</p>
             </div>
          </div>
          <div className="space-y-4 relative z-10">
            <ToggleOption 
               label="Nama Pelanggan" 
               desc="Wajibkan kasir memasukkan nama"
               checked={settings.requireCustomerName} 
               onChange={(val) => setSettings({...settings, requireCustomerName: val})}
            />
            <ToggleOption 
               label="Nomor WhatsApp" 
               desc="Penting untuk pengiriman nota digital"
               checked={settings.requireCustomerPhone} 
               onChange={(val) => setSettings({...settings, requireCustomerPhone: val})}
            />
            <ToggleOption 
               label="Alamat Pengiriman" 
               desc="Munculkan textarea domisili/alamat"
               checked={settings.requireCustomerAddress} 
               onChange={(val) => setSettings({...settings, requireCustomerAddress: val})}
            />
          </div>
        </section>

        {/* HAK AKSES STAFF */}
        <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-rose-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
             <div className="p-3 bg-rose-100 rounded-xl text-rose-500"><ShieldAlert size={24}/></div>
             <div>
               <h2 className="text-xl font-black text-primary">Akses Staf</h2>
               <p className="text-xs text-slate-500 font-bold">Delegasi perlindungan menu</p>
             </div>
          </div>
          <div className="space-y-4 relative z-10">
            {[
              { id: 'DASHBOARD', label: 'Dashboard Stats', desc: 'Grafik dan ringkasan omset' },
              { id: 'REPORTS', label: 'Laporan Penuh', desc: 'Download CSV transaksi' },
            ].map(menu => {
              const isChecked = settings.staffAllowedMenus.includes(menu.id);
              return (
                <label key={menu.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${isChecked ? 'bg-primary/5 border-primary/30' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <div>
                    <span className={`block font-black mb-0.5 ${isChecked ? 'text-primary' : 'text-slate-500'}`}>{menu.label}</span>
                    <span className="block text-xs font-semibold text-slate-400">{menu.desc}</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={isChecked}
                      onChange={() => handleMenuToggle(menu.id)}
                    />
                    <div className="block bg-slate-300 w-14 h-8 rounded-full border border-slate-300 peer-checked:bg-primary transition-colors"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6 shadow-md"></div>
                  </div>
                </label>
              );
            })}
             <div className="mt-4 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-500">
               Catatan: Menu "Kasir" dan "Tracking" secara bawaan wajib bisa diakses oleh setiap staf.
             </div>
          </div>
        </section>

        <div className="lg:col-span-2 flex justify-end mt-4">
          <button 
            onClick={handleSave}
            disabled={loading}
            className={`w-full md:w-auto px-10 py-4 font-black rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${saved ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/30' : 'bg-tertiary hover:bg-tertiary-hover text-primary shadow-tertiary/25 active:scale-95'}`}
          >
            {saved ? <Check size={20} /> : <Save size={20} />} 
            {loading ? "Menyimpan Konfigurasi..." : saved ? "Tersimpan Otomatis" : "Terapkan Perubahan"}
          </button>
        </div>

      </div>
    </div>
  );
}

// Komponen Utility Toggle
const ToggleOption = ({ label, desc, checked, onChange }) => (
  <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked ? 'bg-tertiary/10 border-tertiary/40' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
    <div>
      <span className={`block font-black mb-0.5 ${checked ? 'text-primary' : 'text-slate-500'}`}>{label}</span>
      <span className="block text-xs font-semibold text-slate-400">{desc}</span>
    </div>
    <div className="relative">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="block bg-slate-300 w-14 h-8 rounded-full border border-slate-300 peer-checked:bg-tertiary transition-colors"></div>
      <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6 shadow-md"></div>
    </div>
  </label>
);
