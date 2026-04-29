import { useState, useEffect } from 'react';
import { Save, Sliders, Check, MessageCircle, CheckCircle2, AlertTriangle, Crown, Server, Send, Plus, Trash2 } from 'lucide-react';
import api from '../lib/axios';

export default function Settings() {
  const [settings, setSettings] = useState({
    requireCustomerName: true,
    requireCustomerPhone: true,
    requireCustomerAddress: false,
    staffAllowedMenus: ["CASHIER", "TRACKING"],
    whatsappEnabled: false,
    whatsappApiUrl: 'http://localhost:3000',
    whatsappUsername: 'admin',
    whatsappPassword: '',
    whatsappSenderName: '',
    membershipPackageName: 'Paket Membership',
    membershipDurationDays: 30,
    membershipPackageItems: [],
  });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // WA Test
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestStatus, setWaTestStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    Promise.all([api.get('/settings'), api.get('/services')]).then(([settingsRes, serviceRes]) => {
      setServices(serviceRes.data || []);
      const res = settingsRes;
      if(res.data) {
        let staffMenus = ["CASHIER", "TRACKING"];
        try { staffMenus = JSON.parse(res.data.staffAllowedMenus || '[]'); } catch(e) {}
        const packageItems = res.data.membershipPackage?.items || [];
        setSettings(prev => ({
          ...prev,
          ...res.data,
          staffAllowedMenus: staffMenus,
          membershipPackageName: res.data.membershipPackage?.name || prev.membershipPackageName,
          membershipDurationDays: res.data.membershipPackage?.durationDays || prev.membershipDurationDays,
          membershipPackageItems: packageItems.map((i) => ({
            serviceId: i.serviceId,
            serviceName: i.serviceName,
            unit: i.unit,
            quotaAmount: i.quotaAmount,
            deductionRate: i.deductionRate,
          })),
          whatsappPassword: '',
        }));
      }
    }).catch(console.error);
  }, []);

  const handleMenuToggle = (menuId) => {
    setSettings(prev => {
      const menus = [...prev.staffAllowedMenus];
      if (menus.includes(menuId)) return { ...prev, staffAllowedMenus: menus.filter(m => m !== menuId) };
      return { ...prev, staffAllowedMenus: [...menus, menuId] };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const payload = {
        ...settings,
        membershipPackageItems: settings.membershipPackageItems.map((i) => ({
          serviceId: i.serviceId,
          quotaAmount: Number(i.quotaAmount) || 0,
          deductionRate: Number(i.deductionRate) || 1,
        })),
      };
      await api.put('/settings', payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menyimpan");
    }
    setLoading(false);
  };

  const addPackageItem = () => {
    if (services.length === 0) return;
    const first = services[0];
    setSettings((prev) => ({
      ...prev,
      membershipPackageItems: [
        ...prev.membershipPackageItems,
        { serviceId: first.id, serviceName: first.name, unit: first.unit, quotaAmount: 0, deductionRate: 1 },
      ],
    }));
  };

  const updatePackageItem = (idx, patch) => {
    setSettings((prev) => {
      const next = [...prev.membershipPackageItems];
      const merged = { ...next[idx], ...patch };
      if (patch.serviceId) {
        const service = services.find((s) => s.id === patch.serviceId);
        merged.serviceName = service?.name || '';
        merged.unit = service?.unit || '';
      }
      next[idx] = merged;
      return { ...prev, membershipPackageItems: next };
    });
  };

  const removePackageItem = (idx) => {
    setSettings((prev) => ({
      ...prev,
      membershipPackageItems: prev.membershipPackageItems.filter((_, i) => i !== idx),
    }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setWaTestStatus(null);
    try {
      const res = await api.get('/settings/whatsapp/test');
      setWaTestStatus(res.data);
    } catch (err) {
      setWaTestStatus({ ok: false, error: err.response?.data?.error || err.message });
    }
    setTesting(false);
  };

  const handleSendTestMessage = async () => {
    if (!waTestPhone) return alert('Masukkan nomor HP terlebih dulu');
    setTesting(true);
    setWaTestStatus(null);
    try {
      const res = await api.post('/settings/whatsapp/test-message', { phone: waTestPhone });
      setWaTestStatus(res.data);
    } catch (err) {
      setWaTestStatus({ ok: false, error: err.response?.data?.error || err.message });
    }
    setTesting(false);
  };

  return (
    <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-primary tracking-tight mb-2">Preferensi Sistem</h1>
        <p className="text-slate-500 font-medium">Kustomisasi alur kasir, gateway WhatsApp, dan paket membership kuota.</p>
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
            <ToggleOption label="Nama Pelanggan" desc="Wajibkan kasir memasukkan nama" checked={settings.requireCustomerName} onChange={(val) => setSettings({...settings, requireCustomerName: val})}/>
            <ToggleOption label="Nomor WhatsApp" desc="Penting untuk pengiriman nota digital" checked={settings.requireCustomerPhone} onChange={(val) => setSettings({...settings, requireCustomerPhone: val})}/>
            <ToggleOption label="Alamat Pengiriman" desc="Munculkan textarea domisili/alamat" checked={settings.requireCustomerAddress} onChange={(val) => setSettings({...settings, requireCustomerAddress: val})}/>
          </div>
        </section>

        {/* HAK AKSES STAFF */}
        <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-rose-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <h2 className="text-xl font-black text-primary mb-4">Akses Staf</h2>
          <div className="space-y-3">
            {['DASHBOARD', 'REPORTS', 'CUSTOMERS'].map((menu) => (
              <label key={menu} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-600">{menu}</span>
                <ToggleSwitch checked={settings.staffAllowedMenus.includes(menu)} onChange={() => handleMenuToggle(menu)} />
              </label>
            ))}
          </div>
        </section>

        {/* WHATSAPP GATEWAY (GOWA) */}
        {user.role === 'OWNER' && (
          <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-emerald-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow lg:col-span-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><MessageCircle size={24}/></div>
              <div>
                <h2 className="text-xl font-black text-primary">WhatsApp Gateway (GOWA)</h2>
                <p className="text-xs text-slate-500 font-bold">Aktifkan auto-kirim nota digital ke pelanggan</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="space-y-4">
                <ToggleOption
                  label="Aktifkan Gateway"
                  desc="Nota & update status terkirim otomatis via GOWA"
                  checked={settings.whatsappEnabled}
                  onChange={(v) => setSettings({...settings, whatsappEnabled: v})}
                />
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 flex items-center gap-1.5"><Server size={12}/> URL API GOWA</label>
                  <input value={settings.whatsappApiUrl || ''} onChange={e => setSettings({...settings, whatsappApiUrl: e.target.value})} placeholder="http://localhost:3000" className="premium-input bg-secondary text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nama Pengirim</label>
                  <input value={settings.whatsappSenderName || ''} onChange={e => setSettings({...settings, whatsappSenderName: e.target.value})} placeholder="Nama yang muncul di template" className="premium-input bg-secondary text-sm"/>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Username (Basic Auth)</label>
                    <input value={settings.whatsappUsername || ''} onChange={e => setSettings({...settings, whatsappUsername: e.target.value})} placeholder="admin" className="premium-input bg-secondary text-sm"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Password</label>
                    <input type="password" value={settings.whatsappPassword || ''} onChange={e => setSettings({...settings, whatsappPassword: e.target.value})} placeholder={settings.whatsappPasswordSet ? '•••••••• (tersimpan)' : 'admin'} className="premium-input bg-secondary text-sm"/>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Send size={12}/> Uji Coba</p>
                  <div className="flex gap-2">
                    <input
                      value={waTestPhone}
                      onChange={(e) => setWaTestPhone(e.target.value)}
                      placeholder="08xxx (kirim pesan tes)"
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-primary text-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestMessage}
                      disabled={testing || !settings.whatsappEnabled}
                      className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      Kirim Tes
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-colors"
                  >
                    {testing ? 'Memeriksa...' : 'Periksa Koneksi GOWA'}
                  </button>

                  {waTestStatus && (
                    <div className={`flex items-start gap-2 p-3 rounded-lg text-xs font-bold ${waTestStatus.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {waTestStatus.ok ? <CheckCircle2 size={14} className="mt-0.5"/> : <AlertTriangle size={14} className="mt-0.5"/>}
                      <span>{waTestStatus.ok ? 'OK — gateway terhubung / pesan terkirim.' : `Gagal: ${waTestStatus.error || waTestStatus.reason || 'Unknown'}`}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* MEMBERSHIP PACKAGE */}
        {user.role === 'OWNER' && (
          <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-tertiary relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow lg:col-span-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="p-3 bg-tertiary/20 rounded-xl text-tertiary-hover"><Crown size={24}/></div>
              <div>
                <h2 className="text-xl font-black text-primary">Paket Membership Kuota</h2>
                <p className="text-xs text-slate-500 font-bold">Definisikan 1 paket berbayar dengan kuota per layanan</p>
              </div>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nama Paket</label>
                  <input value={settings.membershipPackageName} onChange={(e) => setSettings({ ...settings, membershipPackageName: e.target.value })} className="premium-input bg-secondary text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Masa Berlaku (hari)</label>
                  <input type="number" min="1" value={settings.membershipDurationDays} onChange={(e) => setSettings({ ...settings, membershipDurationDays: Number(e.target.value) || 30 })} className="premium-input bg-secondary text-sm" />
                </div>
              </div>
              <div className="space-y-3">
                {settings.membershipPackageItems.map((item, idx) => (
                  <div key={`${item.serviceId}-${idx}`} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="col-span-12 md:col-span-5">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Layanan</label>
                      <select value={item.serviceId} onChange={(e) => updatePackageItem(idx, { serviceId: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 text-sm">
                        {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Kuota ({item.unit || '-'})</label>
                      <input type="number" step="0.01" min="0" value={item.quotaAmount} onChange={(e) => updatePackageItem(idx, { quotaAmount: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 text-sm" />
                    </div>
                    <div className="col-span-4 md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Rate Potong</label>
                      <input type="number" step="0.01" min="0.01" value={item.deductionRate} onChange={(e) => updatePackageItem(idx, { deductionRate: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 text-sm" />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <button type="button" onClick={() => removePackageItem(idx)} className="w-full p-2 text-rose-600 bg-rose-50 rounded-lg border border-rose-200"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addPackageItem} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold">
                  <Plus size={16} /> Tambah Item Kuota
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="lg:col-span-2 flex justify-end mt-4 border-t border-slate-200 pt-8">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full md:w-auto px-10 py-4 font-black rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${saved ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/30' : 'bg-tertiary hover:bg-tertiary-hover text-primary shadow-tertiary/25 active:scale-95'}`}
          >
            {saved ? <Check size={20} /> : <Save size={20} />}
            {loading ? "Menyimpan Konfigurasi..." : saved ? "Tersimpan" : "Terapkan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

const ToggleSwitch = ({ checked, onChange }) => (
  <div className="relative">
    <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <div className="block bg-slate-300 w-14 h-8 rounded-full border border-slate-300 peer-checked:bg-tertiary transition-colors"></div>
    <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6 shadow-md"></div>
  </div>
);

const ToggleOption = ({ label, desc, checked, onChange }) => (
  <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked ? 'bg-tertiary/10 border-tertiary/40' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
    <div>
      <span className={`block font-black mb-0.5 ${checked ? 'text-primary' : 'text-slate-500'}`}>{label}</span>
      <span className="block text-xs font-semibold text-slate-400">{desc}</span>
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} />
  </label>
);

// TierInput deprecated: membership sekarang berbasis paket kuota.
