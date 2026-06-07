import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Phone, ShieldCheck } from 'lucide-react';
import api from '../lib/axios';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import PasswordInput, { getPasswordPolicyErrors } from '../components/PasswordInput';

const normalizeIndonesianPhone = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  let v = raw.replace(/[\s-]/g, '');
  if (v.startsWith('+')) v = v.slice(1);
  if (v.startsWith('08')) v = `62${v.slice(1)}`;
  return v;
};

const isValidIndonesianPhone = (value) => /^62\d{8,13}$/.test(normalizeIndonesianPhone(value));

export default function StaffOnboarding() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');

  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const needsEmailVerify = useMemo(() => user?.role === 'STAFF' && user?.isEmailVerified === false, [user]);
  const needsPasswordChange = useMemo(() => user?.role === 'STAFF' && user?.mustChangePassword === true, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'STAFF') {
      navigate('/dashboard');
      return;
    }
    if (!needsEmailVerify && !needsPasswordChange && isValidIndonesianPhone(phone)) {
      navigate('/cashier');
    }
  }, [user, needsEmailVerify, needsPasswordChange, phone, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleSavePhone = async () => {
    const normalized = normalizeIndonesianPhone(phone);
    if (!isValidIndonesianPhone(normalized)) {
      toast.error('Format nomor WhatsApp tidak valid. Gunakan 08xxxxxxxxxx, 628xxxxxxxxxx, atau +628xxxxxxxxxx');
      return;
    }
    try {
      const res = await api.put('/auth/profile', { phone: normalized });
      updateUser({ phone: res.data.user.phone });
      toast.success('Nomor WhatsApp berhasil disimpan');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan nomor WhatsApp');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) return toast.error('Password saat ini wajib diisi');
    if (!newPassword) return toast.error('Password baru wajib diisi');
    const policyErrors = getPasswordPolicyErrors(newPassword);
    if (policyErrors.length > 0) return toast.error(policyErrors[0]);
    if (newPassword !== confirmPassword) return toast.error('Konfirmasi password tidak cocok');
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      updateUser({ mustChangePassword: false });
      toast.success('Password berhasil diubah');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!user?.email) return;
    if (!otp || otp.length !== 6) return toast.error('OTP harus 6 digit');
    setLoading(true);
    try {
      const data = await authService.verifyEmailOtp(user.email, otp);
      toast.success(data.message || 'Email berhasil diverifikasi');
      updateUser({ isEmailVerified: true });
      setOtp('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal verifikasi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    try {
      const data = await authService.resendEmailOtp(user.email);
      toast.success(data.message || 'OTP terkirim');
    } catch (err) {
      const retryAfterSeconds = err.response?.data?.retryAfterSeconds;
      if (typeof retryAfterSeconds === 'number') setCooldown(retryAfterSeconds);
      toast.error(err.response?.data?.message || 'Gagal mengirim ulang OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const isReady = !needsEmailVerify && !needsPasswordChange && isValidIndonesianPhone(phone);

  return (
    <div className="min-h-screen bg-secondary p-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="bg-white border border-slate-200 shadow-2xl p-8 rounded-3xl">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-primary tracking-tight">Setup Akun Staf</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">
              Lengkapi setup awal sebelum masuk ke dashboard.
            </p>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Phone size={18} className="text-primary" />
                <p className="font-black text-primary">Nomor WhatsApp</p>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="premium-input bg-slate-50"
                required
              />
              <button
                type="button"
                onClick={handleSavePhone}
                className="premium-button w-full mt-3"
              >
                Simpan Nomor WhatsApp
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={18} className="text-primary" />
                <p className="font-black text-primary">Ganti Password</p>
              </div>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Password saat ini"
                className="premium-input bg-slate-50"
                required
              />
              <div className="mt-4">
                <PasswordInput label="Password Baru" value={newPassword} onChange={setNewPassword} required />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="premium-input bg-slate-50"
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={loading}
                className="premium-button w-full mt-4"
              >
                {loading ? 'Memproses...' : 'Simpan Password Baru'}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Mail size={18} className="text-primary" />
                <p className="font-black text-primary">Verifikasi Email</p>
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Email: <span className="font-black text-primary">{user?.email}</span>
              </p>
              <div className="mt-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Masukkan OTP 6 digit"
                  className="premium-input bg-slate-50"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={loading}
                  className="premium-button flex-1"
                >
                  Verifikasi
                </button>
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendLoading || cooldown > 0}
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : (resendLoading ? 'Mengirim...' : 'Kirim Ulang')}
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => logout()}
                className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Logout
              </button>
              <button
                type="button"
                onClick={() => navigate('/cashier')}
                disabled={!isReady}
                className="flex-[2] premium-button disabled:opacity-50"
              >
                Lanjut ke Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
