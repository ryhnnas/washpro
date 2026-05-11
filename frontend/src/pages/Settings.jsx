import { useState, useEffect } from 'react';
import { Save, Sliders, Check, MessageCircle, CheckCircle2, AlertTriangle, Crown, Server, Send, Plus, Trash2 } from 'lucide-react';
import api from '../lib/axios';

const DEFAULT_TEMPLATES = {
  RECEIPT: `*{{businessName}}*
Nota Digital — #{{orderId}}
{{separator}}
Halo *{{customerName}}*,
Terima kasih telah mempercayakan cucian Anda.

*Detail Pesanan*
{{detailItems}}

Bayar   : {{paymentMethod}}
Total   : *{{totalPrice}}*
Status  : {{status}}
Waktu   : {{date}}
{{separator}}
Simpan pesan ini sebagai bukti transaksi.
_Nota dikirim otomatis oleh sistem._`,
  PROSES: `*{{businessName}}*
Update Status #{{orderId}}
{{separator}}
Halo *{{customerName}}*,

Pesanan Anda *{{serviceName}}* sekarang berstatus:
*{{statusLabel}}*

Mohon ditunggu ya, kami sedang mengerjakannya dengan sepenuh hati.`,
  SELESAI: `*{{businessName}}*
Update Status #{{orderId}}
{{separator}}
Halo *{{customerName}}*,

Pesanan Anda *{{serviceName}}* sekarang berstatus:
*{{statusLabel}}*

Silakan datang ke gerai untuk pengambilan. Terima kasih!`,
  DIAMBIL: `*{{businessName}}*
Update Status #{{orderId}}
{{separator}}
Halo *{{customerName}}*,

Pesanan Anda *{{serviceName}}* sekarang berstatus:
*{{statusLabel}}*

Terima kasih telah menggunakan jasa kami. Sampai jumpa kembali!`,
};

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
    whatsappTemplates: { ...DEFAULT_TEMPLATES },
  });
  const [activeWaTab, setActiveWaTab] = useState('RECEIPT');

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    Promise.all([api.get('/settings'), api.get('/services')]).then(([settingsRes, serviceRes]) => {
      setServices(serviceRes.data || []);
      const res = settingsRes;
      if(res.data) {
        let staffMenus = ["CASHIER", "TRACKING"];
        try { staffMenus = JSON.parse(res.data.staffAllowedMenus || '[]'); } catch(e) {}
        const packageItems = res.data.membershipPackage?.items || [];
        
        // Gabungkan template dari DB dengan default jika ada yang kosong
        const dbTemplates = res.data.whatsappTemplates || {};
        const mergedTemplates = {};
        Object.keys(DEFAULT_TEMPLATES).forEach(key => {
          mergedTemplates[key] = dbTemplates[key] || DEFAULT_TEMPLATES[key];
        });

        setSettings(prev => ({
          ...prev,
          ...res.data,
          staffAllowedMenus: staffMenus,
          whatsappTemplates: mergedTemplates,
          membershipPackageName: res.data.membershipPackage?.name || prev.membershipPackageName,


          membershipDurationDays: res.data.membershipPackage?.durationDays || prev.membershipDurationDays,
          membershipPackageItems: packageItems.map((i) => ({
            serviceId: i.serviceId,
            serviceName: i.serviceName,
            unit: i.unit,
            quotaAmount: i.quotaAmount,
            deductionRate: i.deductionRate,
          })),
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
      const res = await api.put('/settings', payload);
      
      // Update state with returned templates to ensure sync
      if (res.data.whatsappTemplates) {
        setSettings(prev => ({
          ...prev,
          whatsappTemplates: res.data.whatsappTemplates
        }));
      }

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
        {user.role === 'OWNER' && <WhatsAppSettings />}

        {/* CUSTOM TEMPLATE WA */}
        {user.role === 'OWNER' && (
          <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-emerald-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow lg:col-span-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
               <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><Send size={24}/></div>
               <div>
                 <h2 className="text-xl font-black text-primary">Template Resi WhatsApp</h2>
                 <p className="text-xs text-slate-500 font-bold">Kustomisasi format pesan nota yang dikirim ke pelanggan</p>
               </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-max">
              {Object.keys(DEFAULT_TEMPLATES).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveWaTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeWaTab === tab ? 'bg-white text-emerald-600 shadow-sm scale-105' : 'text-slate-500 hover:text-primary'}`}
                >
                  {tab === 'RECEIPT' ? 'BARU / RESI' : tab}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Isi Pesan Template ({activeWaTab})</label>
                <textarea 
                  rows={12}
                  className="w-full p-4 bg-secondary border border-slate-200 rounded-2xl outline-none text-primary font-medium font-mono text-sm resize-none focus:border-emerald-400 transition-colors"
                  placeholder={`Masukkan template untuk status ${activeWaTab}...`}
                  value={settings.whatsappTemplates[activeWaTab] || ''}
                  onChange={(e) => setSettings({
                    ...settings, 
                    whatsappTemplates: { ...settings.whatsappTemplates, [activeWaTab]: e.target.value }
                  })}
                />
                <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase italic">*Tag yang tersedia menyesuaikan konteks pesan.</p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-black text-primary mb-3 uppercase tracking-wider">Placeholder Tersedia</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 thin-scrollbar">
                  <PlaceholderBadge tag="{{businessName}}" label="Nama Bisnis" />
                  <PlaceholderBadge tag="{{customerName}}" label="Nama Pelanggan" />
                  <PlaceholderBadge tag="{{orderId}}" label="ID Pesanan" />
                  <PlaceholderBadge tag="{{separator}}" label="Garis Pemisah (---)" />
                  
                  {activeWaTab === 'RECEIPT' ? (
                    <>
                      <PlaceholderBadge tag="{{detailItems}}" label="Rincian Layanan" />
                      <PlaceholderBadge tag="{{totalPrice}}" label="Total Harga" />
                      <PlaceholderBadge tag="{{paymentMethod}}" label="Metode Bayar" />
                      <PlaceholderBadge tag="{{status}}" label="Status Transaksi" />
                      <PlaceholderBadge tag="{{date}}" label="Tanggal & Waktu" />
                    </>
                  ) : (
                    <>
                      <PlaceholderBadge tag="{{serviceName}}" label="Nama Layanan Utama" />
                      <PlaceholderBadge tag="{{statusLabel}}" label="Label Status (Indo)" />
                    </>
                  )}
                </div>
                <div className="mt-4 p-2 bg-amber-50 rounded-lg border border-amber-100">
                   <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                     Klik tab di atas untuk mengatur pesan otomatis saat status cucian berubah.
                   </p>
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

const WhatsAppSettings = () => {
  const [waStatus, setWaStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [phoneToPair, setPhoneToPair] = useState('');
  const [loading, setLoading] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [testResult, setTestResult] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaStatus(res.data);
      if (res.data?.status === 'connected') {
        setQrCode(null);
        setPairingCode(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleQR = async () => {
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/connect/qr');
      setQrCode(res.data.qr_code);
      setPairingCode(null);
    } catch (e) {
      alert(e.response?.data?.error || "Gagal request QR");
    }
    setLoading(false);
  };

  const handlePairing = async () => {
    if (!phoneToPair) return alert("Masukkan nomor HP");
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/connect/pairing', { phoneNumber: phoneToPair });
      setPairingCode(res.data.pairing_code);
      setQrCode(null);
    } catch (e) {
      alert(e.response?.data?.error || "Gagal request Pairing");
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Yakin ingin memutuskan koneksi WhatsApp?")) return;
    setLoading(true);
    try {
      await api.post('/whatsapp/disconnect');
      setWaStatus(prev => ({ ...prev, status: 'disconnected' }));
      await fetchStatus();
    } catch (e) {
      alert("Gagal disconnect");
    }
    setLoading(false);
  };

  const handleTest = async () => {
    if (!waTestPhone) return alert("Nomor HP wajib diisi");
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/test-message', { phone: waTestPhone });
      setTestResult(res.data);
    } catch (e) {
      setTestResult({ ok: false, error: e.response?.data?.error || e.message });
    }
    setLoading(false);
  };

  return (
    <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-emerald-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow lg:col-span-2">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
        <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><MessageCircle size={24}/></div>
        <div>
          <h2 className="text-xl font-black text-primary">WhatsApp Gateway</h2>
          <p className="text-xs text-slate-500 font-bold">Kirim nota digital otomatis ke pelanggan (Multi-Device)</p>
        </div>
      </div>

      <div className="relative z-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="font-bold text-slate-600 text-sm">Status:</span>
          {waStatus?.status === 'connected' ? (
             <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={14}/> Terhubung</span>
          ) : waStatus?.status === 'connecting' ? (
             <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={14}/> Menunggu Scan/Pairing</span>
          ) : (
             <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={14}/> Terputus</span>
          )}
        </div>

        {waStatus?.status === 'connected' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-600">Terhubung ke: <span className="font-bold text-primary">{waStatus.detail?.push_name || waStatus.detail?.device_id || 'WhatsApp Device'}</span></p>
              <button onClick={handleDisconnect} disabled={loading} className="px-4 py-2 bg-rose-100 text-rose-600 hover:bg-rose-200 text-sm font-bold rounded-xl transition-colors">
                Putuskan Koneksi
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
               <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Send size={12}/> Uji Coba Pengiriman</p>
               <div className="flex gap-2">
                 <input
                   value={waTestPhone}
                   onChange={(e) => setWaTestPhone(e.target.value)}
                   placeholder="08xxx (kirim tes)"
                   className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-primary text-primary"
                 />
                 <button
                   onClick={handleTest}
                   disabled={loading}
                   className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                 >
                   Kirim Tes
                 </button>
               </div>
               {testResult && (
                 <div className={`flex items-start gap-2 p-3 rounded-lg text-xs font-bold ${testResult.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                   {testResult.ok ? <CheckCircle2 size={14} className="mt-0.5"/> : <AlertTriangle size={14} className="mt-0.5"/>}
                   <span>{testResult.ok ? 'Pesan berhasil dikirim.' : `Gagal: ${testResult.error || testResult.reason || 'Unknown'}`}</span>
                 </div>
               )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opsi QR */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-4 text-center">
              <h3 className="font-bold text-slate-700 text-sm">Hubungkan via QR Code</h3>
              <p className="text-xs text-slate-500 font-medium">Buka WhatsApp &gt; Perangkat Taut &gt; Tautkan Perangkat</p>
              {qrCode ? (
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                  <img src={qrCode.startsWith('http') || qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" className="w-48 h-48" />
                </div>
              ) : (
                <button onClick={handleQR} disabled={loading} className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-colors">
                  Tampilkan QR Code
                </button>
              )}
            </div>
            
            {/* Opsi Pairing Code */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-4 text-center">
              <h3 className="font-bold text-slate-700 text-sm">Hubungkan via Nomor HP</h3>
              <p className="text-xs text-slate-500 font-medium">Gunakan metode ini jika Anda tidak bisa scan QR</p>
              {pairingCode ? (
                <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 w-full">
                  <p className="text-xs font-bold text-slate-500 mb-2">Kode Tautan Anda:</p>
                  <p className="text-3xl font-black text-primary tracking-widest">{pairingCode}</p>
                </div>
              ) : (
                <div className="w-full space-y-3 mt-4">
                  <input
                    value={phoneToPair}
                    onChange={(e) => setPhoneToPair(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-primary text-primary text-center font-bold"
                  />
                  <button onClick={handlePairing} disabled={loading} className="w-full px-5 py-2.5 bg-tertiary text-primary text-sm font-bold rounded-xl hover:bg-tertiary-hover transition-colors">
                    Dapatkan Kode
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const PlaceholderBadge = ({ tag, label }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-max border border-emerald-100">{tag}</span>
    <span className="text-[10px] text-slate-400 font-bold ml-1">{label}</span>
  </div>
);

