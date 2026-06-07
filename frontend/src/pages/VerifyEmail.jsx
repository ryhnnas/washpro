import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialEmail = params.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authService.verifyEmailOtp(email, otp);
      toast.success(data.message || 'Email berhasil diverifikasi. Silakan login.');
      navigate(`/login?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal verifikasi OTP. Periksa kembali.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return toast.error('Email wajib diisi');
    setResendLoading(true);
    try {
      const data = await authService.resendEmailOtp(email);
      toast.success(data.message || 'OTP terkirim.');
    } catch (err) {
      const retryAfterSeconds = err.response?.data?.retryAfterSeconds;
      if (typeof retryAfterSeconds === 'number') setCooldown(retryAfterSeconds);
      toast.error(err.response?.data?.message || 'Gagal mengirim ulang OTP');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-secondary overflow-hidden p-4">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-tertiary/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[440px] bg-white border border-slate-200 shadow-2xl p-8 md:p-10 rounded-3xl z-10 relative">
        <div className="mb-8 text-center flex flex-col items-center">
          <img src="/logo.png" alt="WashPro Logo" className="w-20 h-auto object-contain mb-4" />
          <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">Verifikasi Email</h2>
          <p className="text-slate-500 font-medium text-sm">Masukkan OTP yang dikirim ke email Anda</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Email</label>
            <div className="relative group">
              <input
                type="email"
                placeholder="nama@email.com"
                className="premium-input bg-slate-50 premium-input-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Kode OTP</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="6 digit"
              className="premium-input bg-slate-50"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </div>

          <button
            disabled={loading}
            className="premium-button w-full mt-2 group text-white bg-primary hover:bg-primary-light shadow-primary/25"
          >
            {loading ? 'Memproses...' : (
              <>
                Verifikasi <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || cooldown > 0}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 font-black text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : (resendLoading ? 'Mengirim...' : 'Kirim Ulang OTP')}
          </button>
          <Link
            to="/login"
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 text-white font-black text-center hover:bg-slate-800 transition-colors"
          >
            Ke Login
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <Link to="/login" className="text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </div>
  );
}

