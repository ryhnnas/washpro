import { useState } from 'react';
import { User, Lock, Save, AlertCircle, Phone } from 'lucide-react';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

const normalizeIndonesianPhone = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  let v = raw.replace(/[\s-]/g, '');
  if (v.startsWith('+')) v = v.slice(1);
  if (v.startsWith('08')) v = `62${v.slice(1)}`;
  return v;
};

const isValidIndonesianPhone = (value) => /^62\d{8,13}$/.test(normalizeIndonesianPhone(value));

export default function Profile() {
  const { user, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tasks = [];

      const normalizedPhone = formData.phone ? normalizeIndonesianPhone(formData.phone) : '';
      if (normalizedPhone && !isValidIndonesianPhone(normalizedPhone)) {
        toast.error('Format nomor WhatsApp tidak valid. Gunakan 08xxxxxxxxxx, 628xxxxxxxxxx, atau +628xxxxxxxxxx');
        setLoading(false);
        return;
      }

      const profilePayload = {};
      if (formData.name && formData.name !== user?.name) profilePayload.name = formData.name;
      if (formData.phone !== (user?.phone || '')) profilePayload.phone = normalizedPhone;
      if (Object.keys(profilePayload).length > 0) {
        tasks.push(api.put('/auth/profile', profilePayload));
      }

      if (formData.password) {
        if (!formData.currentPassword) {
          toast.error('Password saat ini wajib diisi');
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Konfirmasi password tidak cocok');
          setLoading(false);
          return;
        }
        tasks.push(api.put('/auth/change-password', { currentPassword: formData.currentPassword, newPassword: formData.password }));
      }

      const results = await Promise.all(tasks);
      const profileRes = results.find((r) => r?.data?.user);
      if (profileRes?.data?.user) {
        updateUser({
          name: profileRes.data.user.name,
          phone: profileRes.data.user.phone,
          isEmailVerified: profileRes.data.user.isEmailVerified,
          mustChangePassword: profileRes.data.user.mustChangePassword,
        });
      } else if (formData.name !== user?.name) {
        updateUser({ name: formData.name });
      }

      toast.success('Perubahan berhasil disimpan');
      setFormData((prev) => ({ ...prev, currentPassword: '', password: '', confirmPassword: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Gagal memperbarui profil");
    }
    setLoading(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary tracking-tight">Manajemen Akun</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">Perbarui informasi profil dan keamanan akun Anda di sini.</p>
      </div>

      <div className="glass-card p-6 sm:p-10 rounded-3xl border-t-primary shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary border-b border-slate-100 pb-4">
              <User size={22} className="text-primary-light" />
              <h2 className="text-xl font-bold">Informasi Dasar</h2>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap</label>
              <div className="relative group">
                <input 
                  required 
                  type="text"
                  placeholder="Masukkan nama lengkap" 
                  className="premium-input bg-secondary premium-input-icon" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nomor WhatsApp</label>
              <div className="relative group">
                <input
                  required
                  type="tel"
                  placeholder="Contoh: 081234567890 / 628123..."
                  className="premium-input bg-secondary premium-input-icon"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-3 text-primary border-b border-slate-100 pb-4">
              <Lock size={22} className="text-primary-light" />
              <h2 className="text-xl font-bold">Keamanan</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 mb-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Password Saat Ini</label>
                <div className="relative group">
                  <input 
                    type="password"
                    placeholder="Wajib diisi jika ingin mengubah password" 
                    className="premium-input bg-secondary premium-input-icon" 
                    value={formData.currentPassword} 
                    onChange={e => setFormData({...formData, currentPassword: e.target.value})} 
                  />
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <PasswordInput
                  label="Password Baru"
                  value={formData.password}
                  onChange={(v) => setFormData({ ...formData, password: v })}
                  required={false}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Konfirmasi Password Baru</label>
                <div className="relative group">
                  <input 
                    type="password"
                    placeholder="Ulangi password baru" 
                    className="premium-input bg-secondary premium-input-icon" 
                    value={formData.confirmPassword} 
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                  />
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 mt-2">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Kosongkan kolom password jika Anda tidak ingin mengubah password saat ini. Gunakan kombinasi huruf dan angka untuk keamanan yang lebih kuat.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="premium-button px-10 py-4 flex items-center gap-3 shadow-lg hover:shadow-primary/20"
            >
              <Save size={20} />
              <span className="text-lg">{loading ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
