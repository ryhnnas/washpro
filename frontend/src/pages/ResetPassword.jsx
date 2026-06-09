import { useState } from 'react';
import { authService } from '../services/authService';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import PasswordInput, { getPasswordPolicyErrors } from '../components/PasswordInput';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('OTP harus 6 digit.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    const policyErrors = getPasswordPolicyErrors(password);
    if (policyErrors.length > 0) {
      toast.error(policyErrors[0]);
      return;
    }

    setLoading(true);
    try {
      const { resetToken } = await authService.verifyOtp(email, otp);
      const data = await authService.resetPassword(resetToken, password);
      toast.success(data.message || 'Kata sandi berhasil diperbarui!');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui kata sandi');
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
          <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">Atur Sandi Baru</h2>
          <p className="text-slate-500 font-medium text-sm">Masukkan OTP email dan kata sandi baru Anda</p>
        </div>

        {!success ? (
          <form onSubmit={handleResetPassword} className="space-y-5">
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
              <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Kode OTP</label>
              <div className="relative group">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="premium-input bg-slate-50 premium-input-icon"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              </div>
            </div>

            <div>
              <PasswordInput label="Kata Sandi Baru" value={password} onChange={setPassword} required />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Konfirmasi Kata Sandi</label>
              <div className="relative group">
                <input
                  type="password"
                  placeholder="Ulangi kata sandi"
                  className="premium-input bg-slate-50 premium-input-icon"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              </div>
            </div>

            <button
              disabled={loading}
              className="premium-button w-full mt-2 group text-white bg-primary hover:bg-primary-light shadow-primary/25 disabled:bg-slate-300 disabled:shadow-none"
            >
              {loading ? 'Memproses...' : (
                <>
                  Simpan Kata Sandi <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-slate-600 text-sm font-medium">
              Kata sandi Anda berhasil diatur ulang!
            </p>
            <p className="text-slate-400 text-xs">
              Mengarahkan Anda kembali ke halaman login dalam beberapa detik...
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <Link to="/login" className="text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    </div>
  );
}
