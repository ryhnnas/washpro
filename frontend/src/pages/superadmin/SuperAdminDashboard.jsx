import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, CreditCard, Package, LogOut,
  CheckCircle, XCircle, MessageSquare, Menu, X, ChevronRight,
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
import './superadmin.css';

const TAB_ICONS = {
  dashboard: LayoutDashboard,
  payments: CreditCard,
  businesses: Store,
  plans: Package,
  whatsapp: MessageSquare,
};

const PAGE_SIZE = 20;
const LIST_TABS = ['businesses', 'payments', 'plans'];
const apiMessage = (err, fallback) => err.response?.data?.message || err.response?.data?.error || fallback;

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState(null);
  const statsRequestId = useRef(0);
  const navigationDialog = useRef(null);
  const [businesses, setBusinesses] = useState([]);
  const [businessQuery, setBusinessQuery] = useState({ page: 1, search: '', status: '' });
  const [businessTotal, setBusinessTotal] = useState(0);
  const [payments, setPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('PENDING');
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [proofModal, setProofModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [planModal, setPlanModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [admin, setAdmin] = useState(null);
  const listRequestId = useRef(0);
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStats = useCallback(async () => {
    const requestId = ++statsRequestId.current;
    setStatsLoading(true);
    try {
      const r = await superAdminService.getStats();
      if (requestId !== statsRequestId.current) return;
      setStats(r.data);
      setStatsUpdatedAt(Date.now());
      setStatsError('');
    } catch (err) {
      if (requestId === statsRequestId.current) setStatsError(apiMessage(err, 'Gagal memuat statistik platform.'));
    } finally {
      if (requestId === statsRequestId.current) setStatsLoading(false);
    }
  }, []);

  const fetchBusinesses = useCallback(async () => {
    const requestId = ++listRequestId.current;
    const isLatest = () => requestId === listRequestId.current;
    setLoading(true);
    setListError('');
    try {
      const params = { page: businessQuery.page, limit: PAGE_SIZE };
      if (businessQuery.search) params.search = businessQuery.search;
      if (businessQuery.status) params.status = businessQuery.status;
      const r = await superAdminService.getBusinesses(params);
      if (!isLatest()) return;
      setBusinesses(r.data.businesses || []);
      setBusinessTotal(r.data.total || 0);
    } catch (err) {
      if (!isLatest()) return;
      setBusinesses([]);
      setListError(apiMessage(err, 'Gagal memuat daftar toko.'));
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, [businessQuery]);

  const fetchPayments = useCallback(async () => {
    const requestId = ++listRequestId.current;
    const isLatest = () => requestId === listRequestId.current;
    setLoading(true);
    setListError('');
    try {
      const r = await superAdminService.getPayments({ status: paymentFilter, page: paymentPage, limit: PAGE_SIZE });
      if (!isLatest()) return;
      setPayments(r.data.payments || []);
      setPaymentTotal(r.data.total || 0);
    } catch (err) {
      if (!isLatest()) return;
      setPayments([]);
      setListError(apiMessage(err, 'Gagal memuat daftar pembayaran.'));
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, [paymentFilter, paymentPage]);

  const fetchPlans = useCallback(async () => {
    const requestId = ++listRequestId.current;
    const isLatest = () => requestId === listRequestId.current;
    setLoading(true);
    setListError('');
    try {
      const r = await superAdminService.getPlans();
      if (!isLatest()) return;
      setPlans(r.data || []);
    } catch (err) {
      if (!isLatest()) return;
      setListError(apiMessage(err, 'Gagal memuat daftar paket.'));
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    superAdminService.getSession()
      .then((r) => setAdmin(r.data.admin))
      .catch(() => navigate('/superadmin/login'));
  }, [navigate]);

  useEffect(() => { if (tab === 'dashboard') fetchStats(); }, [tab, fetchStats]);
  useEffect(() => { if (tab === 'businesses') fetchBusinesses(); }, [tab, fetchBusinesses]);
  useEffect(() => { if (tab === 'payments') fetchPayments(); }, [tab, fetchPayments]);
  useEffect(() => { if (tab === 'plans') fetchPlans(); }, [tab, fetchPlans]);

  const changeTab = (id) => {
    navigationDialog.current?.close();
    if (id !== tab) {
      // Discard in-flight list requests from the previous tab.
      listRequestId.current += 1;
      if (!LIST_TABS.includes(id)) setLoading(false);
    }
    setListError('');
    setTab(id);
  };

  const updateBusinessQuery = useCallback((partial) => {
    setBusinessQuery((prev) => ({ ...prev, ...partial }));
  }, []);

  const changePaymentFilter = (status) => {
    setPaymentFilter(status);
    setPaymentPage(1);
  };

  const handleApprove = async (paymentId) => {
    try {
      await superAdminService.approvePayment(paymentId);
      showToast('Pembayaran berhasil disetujui!');
      fetchPayments();
      fetchStats();
    } catch (err) {
      showToast(apiMessage(err, 'Gagal approve'), 'error');
    }
  };

  const handleReject = async (paymentId, reason) => {
    try {
      await superAdminService.rejectPayment(paymentId, reason);
      showToast('Pembayaran ditolak.');
      fetchPayments();
      fetchStats();
    } catch (err) {
      showToast(apiMessage(err, 'Gagal reject'), 'error');
    }
  };

  const handleToggle = async (businessId, currentStatus) => {
    const action = currentStatus === 'SUSPENDED' ? 'ACTIVATE' : 'SUSPEND';
    try {
      const r = await superAdminService.toggleBusiness(businessId, action);
      showToast(r.data?.message || 'Status toko diperbarui');
      fetchBusinesses();
      fetchStats();
    } catch (err) {
      showToast(apiMessage(err, 'Gagal mengubah status toko'), 'error');
    }
  };

  const handleDelete = async (businessId, confirmName) => {
    try {
      const r = await superAdminService.deleteBusiness(businessId, confirmName);
      showToast(r.data?.message || 'Toko berhasil dinonaktifkan');
      setConfirmModal(null);
      fetchBusinesses();
      fetchStats();
    } catch (err) {
      showToast(apiMessage(err, 'Gagal menonaktifkan toko'), 'error');
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
      showToast(apiMessage(err, 'Gagal menyimpan paket'), 'error');
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

  const sidebar = (mobile = false) => <>
    <div className="sa-brand">
      <img src="/logo.png" alt="WashPro Logo" width="36" height="36" />
      <div><p>WashPro<span>ADMIN CONSOLE</span></p></div>
      {mobile && <button type="button" className="sa-icon-button sa-close-navigation" onClick={() => navigationDialog.current.close()} aria-label="Tutup navigasi"><X size={19} aria-hidden="true" /></button>}
    </div>
    <p className="sa-navigation-label">WORKSPACE</p>
    <nav className="sa-navigation" aria-label="Menu platform">
      {NAV_ITEMS.map(item => {
        const Icon = TAB_ICONS[item.id];
        const badge = item.id === 'payments' ? stats?.pendingPayments : 0;
        return <button key={item.id} type="button" onClick={() => changeTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}
          className={'sa-nav-item' + (tab === item.id ? ' sa-nav-item--active' : '')}>
          <Icon size={18} aria-hidden="true" /><span>{item.label}</span>{badge > 0 && <span className="sa-nav-badge">{badge}</span>}
        </button>;
      })}
    </nav>
    <div className="sa-sidebar-account">
      <div className="sa-account-profile"><div className="sa-account-avatar" aria-hidden="true">{(admin?.name || 'Super Admin').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div>
        <div><p>{admin?.name || 'Super Admin'}</p><span>{admin?.email}</span></div>
      </div>
      <button type="button" onClick={handleLogout} className="sa-logout"><LogOut size={16} aria-hidden="true" />Keluar</button>
    </div>
  </>;

  return (
    <div className="superadmin-shell">
      <aside className="sa-desktop-sidebar" aria-label="Navigasi Super Admin">{sidebar()}</aside>
      <dialog ref={navigationDialog} className="sa-mobile-nav" aria-label="Navigasi Super Admin" onClick={event => { if (event.target === event.currentTarget) navigationDialog.current.close(); }}>
        <div className="sa-mobile-nav-content">{sidebar(true)}</div>
      </dialog>

      <main className="sa-main" id="superadmin-content">
        <header className="sa-topbar">
          <div className="sa-topbar-location">
            <button type="button" className="sa-icon-button sa-mobile-menu-button" onClick={() => navigationDialog.current.showModal()} aria-label="Buka navigasi" aria-haspopup="dialog"><Menu size={20} aria-hidden="true" /></button>
            <span className="sa-topbar-brand">Platform</span><ChevronRight size={13} className="sa-muted" aria-hidden="true" /><span>{NAV_ITEMS.find(item => item.id === tab)?.label}</span>
          </div>
          <div className="sa-topbar-role"><span className="sa-role-dot" />Super Admin</div>
        </header>
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

        <div className="sa-content">
          {tab === 'dashboard' && (
            <DashboardTab stats={stats} error={statsError} loading={statsLoading} updatedAt={statsUpdatedAt} onRetry={fetchStats} onNavigate={(id) => { if (id === 'payments') changePaymentFilter('PENDING'); changeTab(id); }} />
          )}
          {tab === 'payments' && (
            <PaymentsTab
              payments={payments}
              loading={loading}
              error={listError}
              page={paymentPage}
              total={paymentTotal}
              limit={PAGE_SIZE}
              onPageChange={setPaymentPage}
              paymentFilter={paymentFilter}
              setPaymentFilter={changePaymentFilter}
              onRefresh={fetchPayments}
              onViewProof={(p) => setProofModal({
                id: p.id,
                url: p.proofOfPayment,
                businessName: p.business?.name,
                planName: p.plan?.name,
                amount: p.amount,
                status: p.status,
              })}
            />
          )}
          {tab === 'businesses' && (
            <BusinessesTab
              businesses={businesses}
              loading={loading}
              error={listError}
              query={businessQuery}
              total={businessTotal}
              limit={PAGE_SIZE}
              onQueryChange={updateBusinessQuery}
              onRefresh={fetchBusinesses}
              onToggle={handleToggle}
              onDeleteRequest={setConfirmModal}
            />
          )}
          {tab === 'plans' && (
            <>
              {listError && (
                <div role="alert" className="mb-4 flex items-center justify-between gap-3 bg-red-500/10 border border-red-400/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
                  <span>{listError}</span>
                  <button type="button" onClick={fetchPlans} className="font-semibold underline">Coba lagi</button>
                </div>
              )}
              <PlansTab
                plans={plans}
                loading={loading}
                onRefresh={fetchPlans}
                onAdd={() => setPlanModal({ name: '', price: 50000, durationDays: 30, features: 'Kasir Tanpa Batas\nLaporan Keuangan\nManajemen Staf', isActive: true })}
                onEdit={(p) => setPlanModal({ id: p.id, name: p.name, price: p.price, durationDays: p.durationDays, features: Array.isArray(p.features) ? p.features.join('\n') : '', isActive: p.isActive })}
              />
            </>
          )}
          {tab === 'whatsapp' && <WhatsAppTab />}
        </div>
      </main>
    </div>
  );
}
