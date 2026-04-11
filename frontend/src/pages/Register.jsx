import { useState } from 'react';
import { authService } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { Store, ArrowRight } from 'lucide-react';

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
      alert("Bisnis berhasil didaftarkan! Silakan Login.");
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.error || "Gagal daftar");
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
        <div className="mb-10 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-tertiary to-[#d4b300] items-center justify-center text-primary mb-6 shadow-lg shadow-tertiary/30">
            <Store size={32} />
          </div>
          <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">Buka Toko Laundry</h2>
          <p className="text-slate-500 font-medium text-sm">Daftarkan SaaS bisnis Anda ke dalam WashPro</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Nama Toko/Bisnis</label>
              <input 
                type="text" 
                placeholder="Contoh: Rey Laundry" 
                className="premium-input bg-slate-50"
                onChange={e => setFormData({...formData, businessName: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Nama Pemilik</label>
              <input 
                type="text" 
                placeholder="CEO / Owner" 
                className="premium-input bg-slate-50"
                onChange={e => setFormData({...formData, ownerName: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Email Pemilik Bisnis</label>
            <input 
              type="email" 
              placeholder="owner@laundry.com" 
              className="premium-input bg-slate-50"
              onChange={e => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Katasandi Pemilik</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="premium-input bg-slate-50 select-all"
              onChange={e => setFormData({...formData, password: e.target.value})}
              required
              minLength={6}
            />
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
    </div>
  );
}