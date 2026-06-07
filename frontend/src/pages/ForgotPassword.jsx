import { useState } from 'react';
import { authService } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authService.forgotPassword(email);
      toast.success(data.message || 'Kode OTP berhasil dikirim ke email Anda.');
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses permintaan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-secondary overflow-hidden p-4">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-tertiary/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] bg-white border border-slate-200 shadow-2xl p-8 md:p-10 rounded-3xl z-10 relative">
        <div className="mb-8 text-center flex flex-col items-center">
          <img src="/logo.png" alt="WashPro Logo" className="w-20 h-auto object-contain mb-4" />
          <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">Lupa Password</h2>
          <p className="text-slate-500 font-medium text-sm">Masukkan email untuk menerima kode OTP reset password</p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-5">
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
          <Link to="/login" className="text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </div>
  );
}
