import { useState } from 'react';
import { getPasswordRecoveryService } from '../services/passwordRecoveryService';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword({ superAdmin = false }) {
  const recoveryService = getPasswordRecoveryService(superAdmin);
  const loginPath = superAdmin ? '/superadmin/login' : '/login';
  const resetPath = superAdmin ? '/superadmin/reset-password' : '/reset-password';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await recoveryService.forgotPassword(email.trim());
      toast.success(data.message || 'Kode OTP berhasil dikirim ke email Anda.');
      navigate(`${resetPath}?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses permintaan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen relative flex items-center justify-center overflow-hidden p-4 ${superAdmin ? 'bg-slate-950' : 'bg-secondary'}`}>
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-tertiary/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className={`w-full max-w-[420px] border shadow-2xl p-8 md:p-10 rounded-3xl z-10 relative ${superAdmin ? 'bg-slate-900 border-slate-700 text-slate-100 [&_input]:bg-slate-800 [&_input]:text-white [&_input]:border-slate-600' : 'bg-white border-slate-200'}`}>
        <div className="mb-8 text-center flex flex-col items-center">
          <img src="/logo.png" alt="WashPro Logo" className="w-20 h-auto object-contain mb-4" />
          <h2 className={`text-3xl font-black mb-2 tracking-tight ${superAdmin ? 'text-slate-100' : 'text-primary'}`}>Lupa Password{superAdmin ? ' Superadmin' : ''}</h2>
          <p className={`${superAdmin ? 'text-slate-300' : 'text-slate-500'} font-medium text-sm`}>Masukkan email untuk menerima kode OTP reset password</p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-5">
          <div>
            <label htmlFor="recovery-email" className={`block text-sm font-bold mb-2 ml-1 ${superAdmin ? 'text-slate-300' : 'text-slate-500'}`}>Email Terdaftar</label>
            <div className="relative group">
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                className="premium-input bg-slate-50 premium-input-icon"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <button
            disabled={loading}
            className="premium-button w-full mt-2 group text-white bg-primary hover:bg-primary-light shadow-primary/25"
          >
            {loading ? 'Memproses...' : (
              <>
                Kirim Kode OTP <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <Link to={loginPath} className="text-slate-400 hover:text-slate-500 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </div>
  );
}
