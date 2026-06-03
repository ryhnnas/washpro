import { useState } from 'react';
import { authService } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { Store, ArrowRight, User, Mail, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Register() {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.register(formData);
      toast.success('Bisnis berhasil didaftarkan! Silakan login.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mendaftar. Periksa kembali data Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-secondary overflow-hidden p-4 py-12">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-tertiary/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[500px] bg-white border border-slate-200 shadow-2xl p-8 md:p-10 rounded-3xl z-10 relative">
        <div className="mb-8 text-center flex flex-col items-center">
          <img src="/logo.png" alt="WashPro Logo" className="w-20 h-auto object-contain mb-4" />
          <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">Buka Toko Laundry</h2>
          <p className="text-slate-500 font-medium text-sm">Daftarkan SaaS bisnis Anda ke dalam WashPro</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Nama Toko/Bisnis</label>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Contoh: Rey Laundry" 
                  className="premium-input bg-slate-50 premium-input-icon"
                  onChange={e => setFormData({...formData, businessName: e.target.value})}
                  required
                />
                <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Nama Pemilik</label>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="CEO / Owner" 
                  className="premium-input bg-slate-50 premium-input-icon"
                  onChange={e => setFormData({...formData, ownerName: e.target.value})}
                  required
                />
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Email Pemilik Bisnis</label>
            <div className="relative group">
              <input 
                type="email" 
                placeholder="owner@laundry.com" 
                className="premium-input bg-slate-50 premium-input-icon"
                onChange={e => setFormData({...formData, email: e.target.value})}
                required
              />
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Katasandi Pemilik</label>
            <div className="relative group">
              <input 
                type="password" 
                placeholder="••••••••" 
                className="premium-input bg-slate-50 premium-input-icon select-all"
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
                minLength={6}
              />
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <button 
            disabled={loading}
            className="premium-button w-full mt-4 group"
          >
            {loading ? "Memproses..." : (
               <>Mulai Bisnis Anda <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-slate-500 text-sm font-medium">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-primary font-black hover:text-primary-light transition-colors underline decoration-2 underline-offset-4">
              Login di sini
            </Link>
          </p>
          <div className="mt-4">
            <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors flex items-center justify-center gap-1 text-center"><ArrowRight size={14} className="rotate-180"/> Kembali ke Beranda</Link>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
