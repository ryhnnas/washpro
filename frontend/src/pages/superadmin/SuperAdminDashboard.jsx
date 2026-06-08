import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, CreditCard, Package, LogOut,
  CheckCircle, XCircle, MessageSquare,
} from 'lucide-react';
import { NAV_ITEMS } from './constants';
import { superAdminService } from './services/superAdminService';
import ProofModal from './components/ProofModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import PlanModal from './components/PlanModal';
import DashboardTab from './tabs/DashboardTab';
import PaymentsTab from './tabs/PaymentsTab';
import BusinessesTab from './tabs/BusinessesTab';
import PlansTab from './tabs/PlansTab';
import WhatsAppTab from './tabs/WhatsAppTab';

const TAB_ICONS = {
  dashboard: LayoutDashboard,
  payments: CreditCard,
  businesses: Store,
  plans: Package,
  whatsapp: MessageSquare,
};

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [proofModal, setProofModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [plans, setPlans] = useState([]);
  const [planModal, setPlanModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const r = await superAdminService.getStats();
      setStats(r.data);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const r = await superAdminService.getBusinesses();
      setBusinesses(r.data.businesses || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await superAdminService.getPayments(paymentFilter);
      setPayments(r.data.payments || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [paymentFilter]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const r = await superAdminService.getPlans();
      setPlans(r.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    superAdminService.getSession()
      .then((r) => setAdmin(r.data.admin))
      .catch(() => navigate('/superadmin/login'));
    fetchStats();
  }, [fetchStats, navigate]);

  useEffect(() => { if (tab === 'businesses') fetchBusinesses(); }, [tab, fetchBusinesses]);
  useEffect(() => { if (tab === 'payments') fetchPayments(); }, [tab, paymentFilter, fetchPayments]);
  useEffect(() => { if (tab === 'plans') fetchPlans(); }, [tab, fetchPlans]);

  const handleApprove = async (paymentId) => {
    try {
      await superAdminService.approvePayment(paymentId);
      showToast('Pembayaran berhasil disetujui!');
      fetchPayments();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal approve', 'error');
    }
  };

  const handleReject = async (paymentId, reason) => {
    try {
      await superAdminService.rejectPayment(paymentId, reason);
      showToast('Pembayaran ditolak.');
      fetchPayments();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal reject', 'error');
    }
  };

  const handleToggle = async (businessId, currentStatus) => {
    const action = currentStatus === 'SUSPENDED' ? 'ACTIVATE' : 'SUSPEND';
    try {
      await superAdminService.toggleBusiness(businessId, action);
      showToast(`Toko berhasil ${action === 'SUSPEND' ? 'ditangguhkan' : 'diaktifkan'}`);
      fetchBusinesses();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal', 'error');
    }
  };

  const handleDelete = async (businessId) => {
    try {
      await superAdminService.deleteBusiness(businessId);
      showToast('Toko dan seluruh datanya berhasil dihapus!');
      setConfirmModal(null);
      fetchBusinesses();
      fetchStats();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal hapus', 'error');
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      const featuresArr = typeof planModal.features === 'string'
        ? planModal.features.split('\n').filter((f) => f.trim() !== '')
        : planModal.features;

      await superAdminService.savePlan({
        id: planModal.id,
        name: planModal.name,
        price: Number(planModal.price),
        durationDays: Number(planModal.durationDays),
        features: featuresArr,
        isActive: planModal.isActive,
      });
      showToast('Paket berhasil disimpan!');
      setPlanModal(null);
      fetchPlans();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan paket', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await superAdminService.logout();
    } catch {
      /* best-effort */
    }
    navigate('/superadmin/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside className="w-56 bg-slate-900 border-r border-white/5 flex flex-col py-6 flex-shrink-0" aria-label="Navigasi Super Admin">
        <div className="px-5 mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="WashPro Logo" className="w-8 h-8 object-contain" width="32" height="32" />
          <div>
            <p className="text-white font-black text-lg leading-tight">WashPro</p>
            <p className="text-indigo-400 text-xs font-semibold">Super Admin</p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const ItemIcon = TAB_ICONS[item.id];
            const badge = item.id === 'payments' ? stats?.pendingPayments : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <ItemIcon size={18} aria-hidden="true" />
                <span>{item.label}</span>
                {badge > 0 && <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="px-3 mt-4">
          <div className="px-3 py-2 mb-3">
            <p className="text-white text-sm font-semibold">{admin?.name || 'Super Admin'}</p>
            <p className="text-slate-500 text-xs">{admin?.email}</p>
          </div>
          <button type="button" onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={16} aria-hidden="true" /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`} role="status" aria-live="polite">
            {toast.type === 'error' ? <XCircle size={16} aria-hidden="true" /> : <CheckCircle size={16} aria-hidden="true" />}
            {toast.msg}
          </div>
        )}

        <ProofModal
          proofModal={proofModal}
          apiBase={API_BASE}
          onClose={() => setProofModal(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
        <ConfirmDeleteModal
          confirmModal={confirmModal}
          onCancel={() => setConfirmModal(null)}
          onConfirm={handleDelete}
        />
        <PlanModal
          planModal={planModal}
          setPlanModal={setPlanModal}
          onSave={handleSavePlan}
          onClose={() => setPlanModal(null)}
        />

        <div className="p-8">
          {tab === 'dashboard' && <DashboardTab stats={stats} />}
          {tab === 'payments' && (
            <PaymentsTab
              payments={payments}
              loading={loading}
              paymentFilter={paymentFilter}
              setPaymentFilter={setPaymentFilter}
              onRefresh={fetchPayments}
              onViewProof={(p) => setProofModal({ id: p.id, url: p.proofOfPayment, businessName: p.business?.name, planName: p.plan?.name, amount: p.amount })}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
          {tab === 'businesses' && (
            <BusinessesTab
              businesses={businesses}
              loading={loading}
              onRefresh={fetchBusinesses}
              onToggle={handleToggle}
              onDeleteRequest={setConfirmModal}
            />
          )}
          {tab === 'plans' && (
            <PlansTab
              plans={plans}
              loading={loading}
              onRefresh={fetchPlans}
              onAdd={() => setPlanModal({ name: '', price: 50000, durationDays: 30, features: 'Kasir Tanpa Batas\nLaporan Keuangan\nManajemen Staf', isActive: true })}
              onEdit={(p) => setPlanModal({ id: p.id, name: p.name, price: p.price, durationDays: p.durationDays, features: Array.isArray(p.features) ? p.features.join('\n') : '', isActive: p.isActive })}
            />
          )}
          {tab === 'whatsapp' && <WhatsAppTab />}
        </div>
      </main>
    </div>
  );
}
