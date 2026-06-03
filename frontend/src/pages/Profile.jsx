import { useState } from 'react';
import { User, Lock, Save, AlertCircle } from 'lucide-react';
import api from '../lib/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      return toast.error("Konfirmasi password tidak cocok");
    }

    setLoading(true);
    try {
      const payload = { name: formData.name };
      if (formData.password) payload.password = formData.password;

      const res = await api.put('/auth/profile', payload);
      
      // Update context + localStorage sekaligus (tidak perlu reload)
      updateUser({ name: res.data.user.name });
      
      toast.success("Profil berhasil diperbarui");
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      toast.error(err.response?.data?.error || "Gagal memperbarui profil");
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
                  className="premium-input bg-secondary pl-11" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-3 text-primary border-b border-slate-100 pb-4">
              <Lock size={22} className="text-primary-light" />
              <h2 className="text-xl font-bold">Keamanan</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Password Baru</label>
                <div className="relative group">
                  <input 
                    type="password"
                    placeholder="Minimal 6 karakter" 
                    className="premium-input bg-secondary pl-11" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Konfirmasi Password</label>
                <div className="relative group">
                  <input 
                    type="password"
                    placeholder="Ulangi password" 
                    className="premium-input bg-secondary pl-11" 
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
