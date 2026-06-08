import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import superAdminApi from '../../lib/superAdminAxios';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await superAdminApi.post('/superadmin/login', { email, password });
      navigate('/superadmin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Periksa email dan password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="WashPro Logo" className="w-24 h-auto object-contain mb-3" />
          <p className="text-indigo-300 text-sm font-semibold mt-1">Super Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <h2 className="text-white font-bold text-xl mb-6">Masuk ke Panel Admin</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="superadmin-email" className="block text-slate-400 text-sm font-medium mb-1.5">Email</label>
              <input
                id="superadmin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@washpro.local"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-400 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="superadmin-password" className="block text-slate-400 text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="superadmin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-400 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-3 text-red-300 text-sm" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <button
              id="superadmin-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {loading ? 'Memproses...' : 'Masuk Sebagai Admin'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} WashPro SaaS · Panel Superadmin
        </p>
      </div>
    </div>
  );
}
