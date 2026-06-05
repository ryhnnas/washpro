import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('suspended') === '1') {
      setError('Akun Anda ditangguhkan. Mohon chat admin.');
    }
  }, [location.search]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.login(email, password);
      // Gunakan AuthContext login — sync ke localStorage + state sekaligus
      login(data.token, data.user);
      if (data.user.role === 'STAFF' && (!data.user.isEmailVerified || data.user.mustChangePassword)) {
        navigate('/staff-onboarding');
        return;
      }
      // Redirect berdasarkan role: STAFF ke kasir, OWNER ke dashboard
      if (data.user.role === 'STAFF') {
        navigate('/cashier');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        const emailToVerify = err.response?.data?.email || email;
        navigate(`/verify-email?email=${encodeURIComponent(emailToVerify)}`);
        return;
      }
      if (code === 'BUSINESS_SUSPENDED' || code === 'BUSINESS_DELETED') {
        setError('Akun Anda ditangguhkan. Mohon chat admin untuk informasi lebih lanjut.');
        return;
      }
      setError(err.response?.data?.message || 'Login gagal. Periksa email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-secondary overflow-hidden p-4">
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-tertiary/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] bg-white border border-slate-200 shadow-2xl p-8 md:p-10 rounded-3xl z-10 relative">
        <div className="mb-8 text-center flex flex-col items-center">
          <img src="/logo.png" alt="WashPro Logo" className="w-20 h-auto object-contain mb-4" />
          <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">Selamat Datang</h2>
          <p className="text-slate-500 font-medium text-sm">Masuk ke sistem WashPro Web POS</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Email Terdaftar</label>
            <div className="relative group">
              <input 
                type="email" 
                placeholder="nama@email.com" 
                className="premium-input bg-slate-50 premium-input-icon"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2 ml-1">
              <label className="text-sm font-bold text-slate-500">Katasandi</label>
              <Link to="/forgot-password" className="text-xs font-bold text-primary hover:underline">
                Lupa Password?
              </Link>
            </div>
            <div className="relative group">
              <input 
                type="password" 
                placeholder="••••••••" 
                className="premium-input bg-slate-50 premium-input-icon select-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <button 
            disabled={loading}
            className="premium-button w-full mt-2 group text-white bg-primary hover:bg-primary-light shadow-primary/25"
          >
            {loading ? "Memproses..." : (
              <>
                Masuk <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-slate-500 text-sm font-medium">
            Ingin mendaftar layanan baru?{' '}
            <Link to="/register" className="text-primary font-black hover:text-primary-light transition-colors underline decoration-2 underline-offset-4">
              Buka Toko
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
