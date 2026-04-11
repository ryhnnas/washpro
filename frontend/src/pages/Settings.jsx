import { useState, useEffect } from 'react';
import { Save, ShieldAlert, Sliders, Check, Users, UserPlus, Trash2 } from 'lucide-react';
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

  // Staff States
  const [staffList, setStaffList] = useState([]);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '' });
  const [loadingStaff, setLoadingStaff] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    // Fetch Settings
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

    // Fetch Staff if owner
    if (user.role === 'OWNER') {
      fetchStaff();
    }
  }, []);

  const fetchStaff = () => {
    api.get('/staff').then(res => setStaffList(res.data)).catch(console.error);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setLoadingStaff(true);
    try {
      await api.post('/staff', newStaff);
      setNewStaff({ name: '', email: '', password: '' });
      fetchStaff();
      alert("Staf berhasil ditambahkan.");
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || "Gagal menambah staf");
    }
    setLoadingStaff(false);
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm("Yakin ingin menghapus akun staf ini?")) return;
    try {
      await api.delete(`/staff/${id}`);
      fetchStaff();
    } catch (err) {
      alert("Gagal menghapus staf");
    }
  };

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

        {/* MANAJEMEN AKUN STAF (HANYA MUNCUL JIKA OWNER) */}
        {user.role === 'OWNER' && (
          <section className="glass-card bg-white p-6 md:p-8 rounded-3xl border-t-[6px] border-t-blue-500 relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow lg:col-span-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-4">
               <div className="p-3 bg-blue-100 rounded-xl text-blue-500"><Users size={24}/></div>
               <div>
                 <h2 className="text-xl font-black text-primary">Manajemen Akun Staf</h2>
                 <p className="text-xs text-slate-500 font-bold">Tambah atau Hapus akses karyawan</p>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              {/* Form Tambah Staf */}
              <form onSubmit={handleAddStaff} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold flex items-center gap-2 mb-4 text-primary"><UserPlus size={18}/> Tambah Staf Baru</h3>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">Nama Lengkap</label>
                  <input type="text" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} required className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition-all text-primary" placeholder="Nama Karyawan" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">Email Staf</label>
                  <input type="email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} required className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition-all text-primary" placeholder="staf@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">Katasandi Awal</label>
                  <input type="password" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} required minLength={6} className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition-all text-primary" placeholder="Minimal 6 karakter" />
                </div>
                <button disabled={loadingStaff} className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md shadow-blue-500/20">
                  {loadingStaff ? 'Memproses...' : 'Buat Akun Staf'}
                </button>
              </form>

              {/* List Staff */}
              <div className="space-y-3">
                <h3 className="font-bold mb-4 text-primary">Daftar Akun Karyawan ({staffList.length})</h3>
                {staffList.length === 0 ? (
                  <p className="text-sm text-slate-500 p-4 border border-dashed rounded-xl border-slate-300 text-center bg-slate-50">Belum ada staf yang terdaftar.</p>
                ) : (
                  staffList.map(staff => (
                    <div key={staff.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div>
                        <p className="font-bold text-primary text-sm">{staff.name}</p>
                        <p className="text-xs text-slate-500">{staff.email}</p>
                      </div>
                      <button onClick={() => handleDeleteStaff(staff.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100" title="Hapus Staf">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
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
