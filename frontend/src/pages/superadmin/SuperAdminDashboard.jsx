import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, CreditCard, Package, LogOut,
  CheckCircle, XCircle, Eye, AlertTriangle, Trash2, Power,
  Loader2, Users, TrendingUp, Clock, RefreshCw, X, Plus, Edit, Check, MessageSquare
} from 'lucide-react';
import superAdminApi from '../../lib/superAdminAxios';

const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const STATUS_BADGE = {
  TRIAL: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  ACTIVE: 'bg-green-500/20 text-green-300 border-green-400/30',
  PENDING_PAYMENT: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  EXPIRED: 'bg-red-500/20 text-red-300 border-red-400/30',
  SUSPENDED: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
};

const STATUS_LABEL = {
  TRIAL: 'Trial', ACTIVE: 'Aktif', PENDING_PAYMENT: 'Menunggu', EXPIRED: 'Kadaluarsa', SUSPENDED: 'Ditangguhkan',
  PENDING: 'Menunggu', APPROVED: 'Disetujui', REJECTED: 'Ditolak',
};

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [proofModal, setProofModal] = useState(null); // { payment, imageUrl }
  const [confirmModal, setConfirmModal] = useState(null); // { type, id, label }
  const [plans, setPlans] = useState([]);
  const [planModal, setPlanModal] = useState(null);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const admin = JSON.parse(localStorage.getItem('superadmin_user') || '{}');
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStats = useCallback(async () => {
    try { const r = await superAdminApi.get('/superadmin/stats'); setStats(r.data); } catch {}
  }, []);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try { const r = await superAdminApi.get('/superadmin/businesses'); setBusinesses(r.data.businesses || []); } catch {} finally { setLoading(false); }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try { const r = await superAdminApi.get(`/superadmin/payments?status=${paymentFilter}`); setPayments(r.data.payments || []); } catch {} finally { setLoading(false); }
  }, [paymentFilter]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try { const r = await superAdminApi.get('/superadmin/plans'); setPlans(r.data || []); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) navigate('/superadmin/login');
    fetchStats();
  }, []);

  useEffect(() => { if (tab === 'businesses') fetchBusinesses(); }, [tab, fetchBusinesses]);
  useEffect(() => { if (tab === 'payments') fetchPayments(); }, [tab, paymentFilter, fetchPayments]);
  useEffect(() => { if (tab === 'plans') fetchPlans(); }, [tab, fetchPlans]);

  const handleApprove = async (paymentId) => {
    try {
      await superAdminApi.post(`/superadmin/payments/${paymentId}/approve`);
      showToast('Pembayaran berhasil disetujui!');
      fetchPayments(); fetchStats();
    } catch (err) { showToast(err.response?.data?.message || 'Gagal approve', 'error'); }
  };

  const handleReject = async (paymentId, reason) => {
    try {
      await superAdminApi.post(`/superadmin/payments/${paymentId}/reject`, { reason });
      showToast('Pembayaran ditolak.');
      fetchPayments(); fetchStats();
    } catch (err) { showToast(err.response?.data?.message || 'Gagal reject', 'error'); }
  };

  const handleToggle = async (businessId, currentStatus) => {
    const action = currentStatus === 'SUSPENDED' ? 'ACTIVATE' : 'SUSPEND';
    try {
      await superAdminApi.post(`/superadmin/businesses/${businessId}/toggle`, { action });
      showToast(`Toko berhasil ${action === 'SUSPEND' ? 'ditangguhkan' : 'diaktifkan'}`);
      fetchBusinesses(); fetchStats();
    } catch (err) { showToast(err.response?.data?.message || 'Gagal', 'error'); }
  };

  const handleDelete = async (businessId) => {
    try {
      await superAdminApi.delete(`/superadmin/businesses/${businessId}`);
      showToast('Toko dan seluruh datanya berhasil dihapus!');
      setConfirmModal(null); fetchBusinesses(); fetchStats();
    } catch (err) { showToast(err.response?.data?.message || 'Gagal hapus', 'error'); }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      const featuresArr = typeof planModal.features === 'string' 
        ? planModal.features.split('\n').filter(f => f.trim() !== '')
        : planModal.features;

      await superAdminApi.post('/superadmin/plans', {
        id: planModal.id,
        name: planModal.name,
        price: Number(planModal.price),
        durationDays: Number(planModal.durationDays),
        features: featuresArr,
        isActive: planModal.isActive
      });
      showToast('Paket berhasil disimpan!');
      setPlanModal(null);
      fetchPlans();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan paket', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_user');
    navigate('/superadmin/login');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'payments', label: 'Pembayaran', icon: CreditCard, badge: stats?.pendingPayments },
    { id: 'businesses', label: 'Toko', icon: Store },
    { id: 'plans', label: 'Paket', icon: Package },
    { id: 'whatsapp', label: 'WA Superadmin', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 border-r border-white/5 flex flex-col py-6 flex-shrink-0">
        <div className="px-5 mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="WashPro Logo" className="w-8 h-8 object-contain" />
          <div>
            <p className="text-white font-black text-lg leading-tight">WashPro</p>
            <p className="text-indigo-400 text-xs font-semibold">Super Admin</p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {badge > 0 && <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
            </button>
          ))}
        </nav>
        <div className="px-3 mt-4">
          <div className="px-3 py-2 mb-3">
            <p className="text-white text-sm font-semibold">{admin.name}</p>
            <p className="text-slate-500 text-xs">{admin.email}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
            {toast.type === 'error' ? <XCircle size={16} /> : <CheckCircle size={16} />}
            {toast.msg}
          </div>
        )}

        {/* Proof Modal */}
        {proofModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setProofModal(null)}>
            <div className="bg-slate-900 rounded-2xl p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-bold">Bukti Pembayaran</h3>
                <button onClick={() => setProofModal(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>
              <img src={proofModal.url.startsWith('/uploads') ? `${API_BASE.replace('/api', '')}${proofModal.url}` : proofModal.url}
                alt="Bukti" className="w-full rounded-xl max-h-96 object-contain bg-white" />
              <div className="mt-3 text-slate-400 text-sm space-y-1">
                <p>Toko: <span className="text-white font-semibold">{proofModal.businessName}</span></p>
                <p>Paket: <span className="text-white">{proofModal.planName}</span></p>
                <p>Nominal: <span className="text-white font-bold">{formatIDR(proofModal.amount)}</span></p>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { handleApprove(proofModal.id); setProofModal(null); }} className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Approve
                </button>
                <button onClick={() => { handleReject(proofModal.id, 'Bukti tidak valid'); setProofModal(null); }} className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <XCircle size={16} /> Tolak
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Delete Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-xl"><AlertTriangle size={24} className="text-red-400" /></div>
                <div>
                  <h3 className="text-white font-bold">Hapus Toko Permanen?</h3>
                  <p className="text-slate-400 text-sm">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm mb-6">Seluruh data toko <strong className="text-white">{confirmModal.label}</strong> termasuk transaksi, pelanggan, dan layanan akan dihapus permanen dari database.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-semibold">Batal</button>
                <button onClick={() => handleDelete(confirmModal.id)} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-colors flex items-center justify-center gap-2">
                  <Trash2 size={16} /> Hapus Permanen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plan Modal */}
        {planModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPlanModal(null)}>
            <div className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-lg">{planModal.id ? 'Edit Paket Berlangganan' : 'Tambah Paket Baru'}</h3>
                <button onClick={() => setPlanModal(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-xs font-bold mb-1.5">Nama Paket</label>
                  <input
                    type="text"
                    value={planModal.name}
                    onChange={(e) => setPlanModal({ ...planModal, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-bold mb-1.5">Harga (Rp)</label>
                    <input
                      type="number"
                      value={planModal.price}
                      onChange={(e) => setPlanModal({ ...planModal, price: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-bold mb-1.5">Masa Aktif (Hari)</label>
                    <input
                      type="number"
                      value={planModal.durationDays}
                      onChange={(e) => setPlanModal({ ...planModal, durationDays: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-bold mb-1.5">Daftar Fitur (Satu fitur per baris)</label>
                  <textarea
                    rows={4}
                    value={planModal.features}
                    onChange={(e) => setPlanModal({ ...planModal, features: e.target.value })}
                    placeholder="Kasir Tanpa Batas&#10;Laporan Keuangan&#10;Manajemen Staf"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                    required
                  ></textarea>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActivePlan"
                    checked={planModal.isActive}
                    onChange={(e) => setPlanModal({ ...planModal, isActive: e.target.checked })}
                    className="w-4 h-4 rounded bg-white/5 border-white/10 text-indigo-500 focus:ring-0"
                  />
                  <label htmlFor="isActivePlan" className="text-slate-300 text-sm font-semibold cursor-pointer">Status Paket Aktif (Bisa dibeli tenant)</label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button type="button" onClick={() => setPlanModal(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-semibold text-sm">Batal</button>
                  <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold transition-colors text-sm">Simpan Paket</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="p-8">
          {/* ===== DASHBOARD TAB ===== */}
          {tab === 'dashboard' && (
            <div>
              <h1 className="text-2xl font-black text-white mb-2">Dashboard</h1>
              <p className="text-slate-400 mb-8">Ringkasan platform WashPro SaaS</p>
              {stats ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Toko', value: stats.totalBusinesses, icon: Store, color: 'indigo' },
                    { label: 'Toko Aktif', value: stats.activeBusinesses, icon: CheckCircle, color: 'green' },
                    { label: 'Masa Trial', value: stats.trialBusinesses, icon: Clock, color: 'blue' },
                    { label: 'Menunggu Konfirmasi', value: stats.pendingPayments, icon: CreditCard, color: 'amber' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`bg-${color}-500/10 border border-${color}-400/20 rounded-2xl p-5`}>
                      <Icon size={20} className={`text-${color}-400 mb-3`} />
                      <p className="text-3xl font-black text-white">{value}</p>
                      <p className="text-slate-400 text-sm mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              ) : <div className="text-slate-500">Memuat statistik...</div>}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp size={20} className="text-green-400" />
                  <h2 className="text-white font-bold">Pendapatan Bulan Ini</h2>
                </div>
                <p className="text-4xl font-black text-green-400">{formatIDR(stats?.monthlyRevenue || 0)}</p>
                <p className="text-slate-500 text-sm mt-1">Dari pembayaran yang telah disetujui</p>
              </div>
            </div>
          )}

          {/* ===== PAYMENTS TAB ===== */}
          {tab === 'payments' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black text-white">Verifikasi Pembayaran</h1>
                  <p className="text-slate-400">Periksa dan konfirmasi bukti transfer QRIS</p>
                </div>
                <div className="flex gap-2">
                  {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                    <button key={s} onClick={() => setPaymentFilter(s)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${paymentFilter === s ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                  <button onClick={fetchPayments} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><RefreshCw size={16} /></button>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-48 text-slate-500"><Loader2 size={24} className="animate-spin mr-2" /> Memuat...</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-16 text-slate-600">Tidak ada pembayaran dengan status ini.</div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-white font-bold">{p.business?.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                        </div>
                        <p className="text-slate-400 text-sm">{p.plan?.name} · {formatIDR(p.amount)}</p>
                        <p className="text-slate-600 text-xs mt-1">{new Date(p.createdAt).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setProofModal({ id: p.id, url: p.proofOfPayment, businessName: p.business?.name, planName: p.plan?.name, amount: p.amount })}
                          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
                        >
                          <Eye size={14} /> Lihat Bukti
                        </button>
                        {p.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleApprove(p.id)} className="px-3 py-2 rounded-xl bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white text-sm font-semibold transition-all flex items-center gap-1.5">
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button onClick={() => handleReject(p.id, 'Bukti tidak valid')} className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-sm font-semibold transition-all flex items-center gap-1.5">
                              <XCircle size={14} /> Tolak
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== BUSINESSES TAB ===== */}
          {tab === 'businesses' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black text-white">Manajemen Toko</h1>
                  <p className="text-slate-400">Kelola seluruh tenant WashPro</p>
                </div>
                <button onClick={fetchBusinesses} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><RefreshCw size={16} /></button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-48 text-slate-500"><Loader2 size={24} className="animate-spin mr-2" /> Memuat...</div>
              ) : (
                <div className="space-y-3">
                  {businesses.map((b) => (
                    <div key={b.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-white font-bold">{b.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_BADGE[b.subscriptionStatus]}`}>
                            {STATUS_LABEL[b.subscriptionStatus]}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">{b.users?.[0]?.name} · {b.users?.[0]?.email}</p>
                        <div className="flex gap-4 mt-1 text-xs text-slate-600">
                          <span>{b._count?.transactions} transaksi</span>
                          <span>{b._count?.customers} pelanggan</span>
                          {b.subscriptionEndAt && <span>Aktif s/d {new Date(b.subscriptionEndAt).toLocaleDateString('id-ID')}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggle(b.id, b.subscriptionStatus)}
                          className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                            b.subscriptionStatus === 'SUSPENDED'
                              ? 'bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white'
                              : 'bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-white'
                          }`}
                        >
                          <Power size={14} />
                          {b.subscriptionStatus === 'SUSPENDED' ? 'Aktifkan' : 'Tangguhkan'}
                        </button>
                        <button
                          onClick={() => setConfirmModal({ id: b.id, label: b.name })}
                          className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-sm font-semibold transition-all flex items-center gap-1.5"
                        >
                          <Trash2 size={14} /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== PLANS TAB ===== */}
          {tab === 'plans' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black text-white">Paket Berlangganan</h1>
                  <p className="text-slate-400">Kelola harga, durasi, dan fitur paket POS</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPlanModal({ name: '', price: 50000, durationDays: 30, features: 'Kasir Tanpa Batas\nLaporan Keuangan\nManajemen Staf', isActive: true })}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all flex items-center gap-2 text-sm"
                  >
                    <Plus size={16} /> Tambah Paket
                  </button>
                  <button onClick={fetchPlans} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><RefreshCw size={16} /></button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-48 text-slate-500"><Loader2 size={24} className="animate-spin mr-2" /> Memuat paket...</div>
              ) : plans.length === 0 ? (
                <div className="text-center py-16 text-slate-600">Belum ada paket berlangganan.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((p) => (
                    <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${p.isActive ? 'bg-green-500/20 text-green-300 border-green-400/30' : 'bg-slate-500/20 text-slate-400 border-slate-400/30'}`}>
                            {p.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                          <button
                            onClick={() => setPlanModal({ id: p.id, name: p.name, price: p.price, durationDays: p.durationDays, features: Array.isArray(p.features) ? p.features.join('\n') : '', isActive: p.isActive })}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                        <h3 className="text-xl font-black text-white mb-1">{p.name}</h3>
                        <p className="text-2xl font-black text-indigo-400 mb-1">{formatIDR(p.price)}</p>
                        <p className="text-xs text-slate-400 mb-4">{p.durationDays} hari masa aktif</p>
                        
                        {Array.isArray(p.features) && (
                          <div className="space-y-2 border-t border-white/5 pt-4 mb-4">
                            {p.features.map((f, fi) => (
                              <div key={fi} className="flex items-center gap-2 text-xs text-slate-300">
                                <Check size={14} className="text-green-400 flex-shrink-0" />
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 flex justify-between">
                        <span>ID: {p.id.substring(0, 8)}...</span>
                        <span>Diperbarui: {new Date(p.updatedAt).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== WHATSAPP TAB ===== */}
          {tab === 'whatsapp' && (
            <WhatsAppSuperAdminSettings />
          )}
        </div>
      </main>
    </div>
  );
}

const WhatsAppSuperAdminSettings = () => {
  const [waStatus, setWaStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [pairingCode, setPairingCode] = useState(null);
  const [phoneToPair, setPhoneToPair] = useState('');
  const [loading, setLoading] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [testResult, setTestResult] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await superAdminApi.get('/superadmin/whatsapp/status');
      setWaStatus(res.data);
      if (res.data?.status === 'connected') {
        setQrCode(null);
        setPairingCode(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleQR = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.post('/superadmin/whatsapp/connect/qr');
      setQrCode(res.data.qr_code);
      setPairingCode(null);
    } catch (e) {
      alert(e.response?.data?.error || "Gagal request QR");
    }
    setLoading(false);
  };

  const handlePairing = async () => {
    if (!phoneToPair) return alert("Masukkan nomor HP");
    setLoading(true);
    try {
      const res = await superAdminApi.post('/superadmin/whatsapp/connect/pairing', { phoneNumber: phoneToPair });
      setPairingCode(res.data.pairing_code);
      setQrCode(null);
    } catch (e) {
      alert(e.response?.data?.error || "Gagal request Pairing");
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Yakin ingin memutuskan koneksi WhatsApp Superadmin?")) return;
    setLoading(true);
    try {
      await superAdminApi.post('/superadmin/whatsapp/disconnect');
      setWaStatus(prev => ({ ...prev, status: 'disconnected' }));
      await fetchStatus();
    } catch (e) {
      alert("Gagal disconnect");
    }
    setLoading(false);
  };

  const handleTest = async () => {
    if (!waTestPhone) return alert("Nomor HP wajib diisi");
    setLoading(true);
    try {
      const res = await superAdminApi.post('/superadmin/whatsapp/test-message', { phone: waTestPhone });
      setTestResult(res.data);
    } catch (e) {
      setTestResult({ ok: false, error: e.response?.data?.error || e.message });
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-2">WhatsApp Gateway SuperAdmin</h1>
      <p className="text-slate-400 mb-8">Hubungkan nomor WhatsApp pusat platform untuk mengirimkan notifikasi penagihan/konfirmasi langganan ke Tenant.</p>
      
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="font-bold text-slate-400 text-sm">Status:</span>
          {waStatus?.status === 'connected' ? (
             <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold flex items-center gap-1"><Check size={14}/> Terhubung</span>
          ) : waStatus?.status === 'connecting' ? (
             <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={14}/> Menunggu Scan/Pairing</span>
          ) : (
             <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-400/30 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={14}/> Terputus</span>
          )}
        </div>

        {waStatus?.status === 'connected' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-300">Terhubung ke: <span className="font-bold text-white">{waStatus.detail?.push_name || waStatus.detail?.device_id || 'WhatsApp Device'}</span></p>
              <button onClick={handleDisconnect} disabled={loading} className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-sm font-bold rounded-xl transition-colors">
                Putuskan Koneksi
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
               <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><RefreshCw size={12}/> Uji Coba Pengiriman</p>
               <div className="flex gap-2">
                 <input
                   value={waTestPhone}
                   onChange={(e) => setWaTestPhone(e.target.value)}
                   placeholder="08xxx (kirim tes)"
                   className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-indigo-500 text-white"
                 />
                 <button
                   onClick={handleTest}
                   disabled={loading}
                   className="px-3 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-400 disabled:opacity-50 transition-colors whitespace-nowrap"
                 >
                   Kirim Tes
                 </button>
               </div>
               {testResult && (
                 <div className={`flex items-start gap-2 p-3 rounded-lg text-xs font-bold ${testResult.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                   {testResult.ok ? <Check size={14} className="mt-0.5"/> : <XCircle size={14} className="mt-0.5"/>}
                   <span>{testResult.ok ? 'Pesan berhasil dikirim.' : `Gagal: ${testResult.error || testResult.reason || 'Unknown'}`}</span>
                 </div>
               )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opsi QR */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-4 text-center">
              <h3 className="font-bold text-white text-sm">Hubungkan via QR Code</h3>
              <p className="text-xs text-slate-400 font-medium">Buka WhatsApp &gt; Perangkat Taut &gt; Tautkan Perangkat</p>
              {qrCode ? (
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                  <img src={qrCode.startsWith('http') || qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" className="w-48 h-48" />
                </div>
              ) : (
                <button onClick={handleQR} disabled={loading} className="mt-4 px-5 py-2.5 bg-indigo-500 text-white text-sm font-bold rounded-xl hover:bg-indigo-400 transition-colors">
                  Tampilkan QR Code
                </button>
              )}
            </div>
            
            {/* Opsi Pairing Code */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-4 text-center">
              <h3 className="font-bold text-white text-sm">Hubungkan via Nomor HP</h3>
              <p className="text-xs text-slate-400 font-medium">Gunakan metode ini jika Anda tidak bisa scan QR</p>
              {pairingCode ? (
                <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 w-full text-slate-800">
                  <p className="text-xs font-bold text-slate-500 mb-2">Kode Tautan Anda:</p>
                  <p className="text-3xl font-black text-indigo-600 tracking-widest">{pairingCode}</p>
                </div>
              ) : (
                <div className="w-full space-y-3 mt-4">
                  <input
                    value={phoneToPair}
                    onChange={(e) => setPhoneToPair(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-indigo-500 text-white text-center font-bold"
                  />
                  <button onClick={handlePairing} disabled={loading} className="w-full px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold rounded-xl transition-colors">
                    Dapatkan Kode
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
