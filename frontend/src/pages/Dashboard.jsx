import { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  DollarSign, FileText, TrendingUp, TrendingDown, Sparkles, AlertCircle, ArrowRight, Clock, Users,
  TriangleAlert, Wallet, RefreshCw, MessageCircle, BadgeCheck, Ban, Receipt, Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import DateFilter from '../components/DateFilter';
import { getDateRange, getTrendRange, validateCustomDate, BUSINESS_TZ_OFFSET } from '../utils/dateRange';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { canAccessStaffMenu } from '../utils/staffAccess';
import { StaffAccessDenied } from '../components/StaffMenuGate';

const PAYMENT_META = {
  CASH: { label: 'Tunai', color: '#1A365D' },
  QRIS: { label: 'QRIS', color: '#FFD700' },
  BAYAR_NANTI: { label: 'Bayar Nanti', color: '#f59e0b' },
};

const STATUS_COLORS = {
  PENDING: 'bg-amber-400',
  PROSES: 'bg-blue-400',
  SELESAI: 'bg-emerald-400',
  DIAMBIL: 'bg-slate-400',
  CANCELLED: 'bg-rose-400',
};

const STATUS_BADGES = {
  PENDING: 'bg-amber-100 text-amber-700',
  PROSES: 'bg-blue-100 text-blue-700',
  SELESAI: 'bg-emerald-100 text-emerald-700',
  DIAMBIL: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

const EMPTY_STATS = {
  totalTransactions: 0,
  totalRevenue: 0,
  averageOrderValue: 0,
  receivable: { amount: 0, count: 0 },
  cancelled: { count: 0, amount: 0 },
  activeQueue: 0,
  overdueCount: 0,
  totalCustomers: 0,
  newCustomers: null,
  previous: null,
  paymentStats: [],
  statusStats: [],
  membership: { active: 0, expiringSoon: 0, expiringDays: 7 },
  whatsapp: { status: 'disconnected', pending: 0, failed: 0 },
  todayOrders: [],
};

const rupiah = (value) => `Rp ${(value || 0).toLocaleString('id-ID')}`;

export default function Dashboard() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [trend, setTrend] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panelErrors, setPanelErrors] = useState({ trend: '', top: '' });
  const [panelLoading, setPanelLoading] = useState({ trend: false, top: false });
  const [accessDenied, setAccessDenied] = useState(false);
  const requests = useRef({ generation: 0, trend: 0, top: 0 });
  const { user } = useAuth();
  const { settings, refreshSettings } = useApp();
  const canReport = canAccessStaffMenu(user, settings, 'REPORTS');
  const [reloadKey, setReloadKey] = useState(0);
  const [chartsReady, setChartsReady] = useState(false);

  const [dateFilter, setDateFilter] = useState('hari_ini');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });
  const dateValidation = dateFilter === 'kustom' ? validateCustomDate(customDate) : '';
  const apiMessage = (err, fallback) => err.response?.data?.message || err.response?.data?.error || fallback;

  useEffect(() => {
    const t = setTimeout(() => setChartsReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    requests.current.generation += 1;
    if (dateValidation) return undefined;
    const { startDate, endDate } = getDateRange(dateFilter, customDate);
    const tzOffset = BUSINESS_TZ_OFFSET;
    const trendRange = getTrendRange({ startDate, endDate });

    const fetchAll = async () => {
      setLoading(true);
      setError('');
      setPanelErrors({ trend: '', top: '' });
      setPanelLoading({ trend: false, top: false });
      const [statsRes, trendRes, topRes] = await Promise.allSettled([
        api.get('/dashboard/stats', { params: { startDate, endDate } }),
        api.get('/dashboard/revenue-trend', { params: { ...trendRange, tzOffset } }),
        api.get('/dashboard/top-services', { params: { startDate, endDate } }),
      ]);
      if (cancelled) return;
      if ([statsRes, trendRes, topRes].some(result => result.status === 'rejected' && result.reason?.response?.data?.code === 'STAFF_PERMISSION_DENIED')) {
        setAccessDenied(true); setLoading(false); void refreshSettings(); return;
      }

      if (statsRes.status === 'fulfilled') {
        setStats({ ...EMPTY_STATS, ...statsRes.value.data });
      } else {
        setStats(EMPTY_STATS);
        setError(apiMessage(statsRes.reason, 'Gagal memuat data dashboard.'));
      }
      setPanelErrors({ trend: trendRes.status === 'rejected' ? apiMessage(trendRes.reason, 'Gagal memuat tren pendapatan.') : '',
        top: topRes.status === 'rejected' ? apiMessage(topRes.reason, 'Gagal memuat layanan terlaris.') : '' });
      setTrend(trendRes.status === 'fulfilled' ? trendRes.value.data?.data || [] : []);
      setTopServices(topRes.status === 'fulfilled' ? topRes.value.data?.data || [] : []);
      setLoading(false);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [dateFilter, customDate, dateValidation, reloadKey, refreshSettings]);

  const retryPanel = async (panel) => {
    if (dateValidation) return;
    const generation = requests.current.generation;
    const id = ++requests.current[panel];
    const range = getDateRange(dateFilter, customDate);
    setPanelLoading(prev => ({ ...prev, [panel]: true }));
    const current = () => generation === requests.current.generation && id === requests.current[panel];
    try {
      const response = await api.get(panel === 'trend' ? '/dashboard/revenue-trend' : '/dashboard/top-services', {
        params: panel === 'trend' ? { ...getTrendRange(range), tzOffset: BUSINESS_TZ_OFFSET } : range,
      });
      if (!current()) return;
      if (panel === 'trend') setTrend(response.data.data || []); else setTopServices(response.data.data || []);
      setPanelErrors(prev => ({ ...prev, [panel]: '' }));
    } catch (err) {
      if (!current()) return;
      if (err.response?.data?.code === 'STAFF_PERMISSION_DENIED') { setAccessDenied(true); void refreshSettings(); }
      else setPanelErrors(prev => ({ ...prev, [panel]: apiMessage(err, panel === 'trend' ? 'Gagal memuat tren pendapatan.' : 'Gagal memuat layanan terlaris.') }));
    } finally { if (current()) setPanelLoading(prev => ({ ...prev, [panel]: false })); }
  };
  if (accessDenied) return <StaffAccessDenied />;
  if (dateValidation || error) return <div className="space-y-4">
    <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
    <DateFilter filter={dateFilter} setFilter={setDateFilter} customDate={customDate} setCustomDate={setCustomDate} />
    {error && !dateValidation && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800"><p>{error}</p><button type="button" onClick={retry} className="font-bold underline">Coba lagi</button></div>}
  </div>;

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-200 rounded-3xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  const statusTotal = stats.statusStats.reduce((sum, s) => sum + s.value, 0) || 1;
  const paymentTotal = stats.paymentStats.reduce((sum, p) => sum + p.amount, 0);
  const topRevenueMax = Math.max(1, ...topServices.map((s) => s.revenue));
  const waConnected = stats.whatsapp.status === 'connected';
  const comparisonLabel = dateFilter === 'hari_ini' ? 'kemarin' : 'periode sebelumnya';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-2">
            Dashboard <Sparkles className="text-tertiary" size={24} />
          </h1>
          <p className="text-primary-light mt-1 font-medium">Ringkasan performa bisnis Anda berdasarkan periode.</p>
        </div>
        <DateFilter
          filter={dateFilter}
          setFilter={setDateFilter}
          customDate={customDate}
          setCustomDate={setCustomDate}
        />
      </div>

      {error && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-4">
          <p className="text-sm font-bold flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-rose-200 text-sm font-bold hover:bg-rose-100 transition-colors"
          >
            <RefreshCw size={14} /> Coba lagi
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <StatCard
          icon={<DollarSign size={24} />}
          label="Pendapatan (Lunas)"
          value={rupiah(stats.totalRevenue)}
          tone="primary"
          delta={getDelta(stats.totalRevenue, stats.previous?.totalRevenue)}
          deltaLabel={comparisonLabel}
        />
        <StatCard
          icon={<FileText size={24} />}
          label="Transaksi"
          value={stats.totalTransactions}
          tone="tertiary"
          delta={getDelta(stats.totalTransactions, stats.previous?.totalTransactions)}
          deltaLabel={comparisonLabel}
        />
        <StatCard
          icon={<Wallet size={24} />}
          label="Piutang (Bayar Nanti)"
          value={rupiah(stats.receivable.amount)}
          sub={`${stats.receivable.count} transaksi belum dibayar`}
          tone={stats.receivable.count > 0 ? 'amber' : 'slate'}
        />
        <StatCard
          icon={<Clock size={24} />}
          label="Antrian Aktif"
          value={stats.activeQueue}
          sub="Pending + Proses"
          tone="emerald"
        />
        <Link to="/tracking" className="block group/link">
          <StatCard
            icon={<TriangleAlert size={24} />}
            label="Keterlambatan"
            value={stats.overdueCount}
            sub={stats.overdueCount > 0 ? 'Perlu segera diproses' : 'Semua tepat waktu'}
            tone={stats.overdueCount > 0 ? 'danger' : 'slate'}
            isClickable
          />
        </Link>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm grid grid-cols-2 lg:grid-cols-5 divide-slate-100 lg:divide-x">
        <MiniMetric
          icon={<Receipt size={16} />}
          label="Rata-rata Transaksi"
          value={rupiah(stats.averageOrderValue)}
        />
        <MiniMetric
          icon={<Users size={16} />}
          label={stats.newCustomers === null ? 'Total Pelanggan' : 'Pelanggan Baru'}
          value={stats.newCustomers === null ? stats.totalCustomers : stats.newCustomers}
          sub={stats.newCustomers === null ? null : `dari ${stats.totalCustomers} pelanggan`}
        />
        <MiniMetric
          icon={<Ban size={16} />}
          label="Dibatalkan"
          value={stats.cancelled.count}
          sub={stats.cancelled.count > 0 ? rupiah(stats.cancelled.amount) : null}
        />
        <MiniMetric
          icon={<BadgeCheck size={16} />}
          label="Member Aktif"
          value={stats.membership.active}
          sub={stats.membership.expiringSoon > 0
            ? `${stats.membership.expiringSoon} berakhir ≤ ${stats.membership.expiringDays} hari`
            : null}
          subTone={stats.membership.expiringSoon > 0 ? 'warn' : undefined}
        />
        <MiniMetric
          icon={<MessageCircle size={16} />}
          label="WhatsApp"
          value={waConnected ? 'Terhubung' : 'Terputus'}
          valueTone={waConnected ? 'ok' : 'bad'}
          sub={stats.whatsapp.failed > 0
            ? `${stats.whatsapp.failed} pesan gagal`
            : stats.whatsapp.pending > 0 ? `${stats.whatsapp.pending} pesan antri` : null}
          subTone={stats.whatsapp.failed > 0 ? 'bad' : undefined}
        />
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="text-xl font-black text-primary flex items-center gap-3">
            <div className="p-2 bg-tertiary/20 rounded-lg text-tertiary-hover"><TrendingUp size={20} /></div>
            Tren Pendapatan
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            {trend.length} hari terakhir
          </span>
        </div>
        <div className="w-full min-w-0">
          {panelLoading.trend ? <p role="status">Memuat tren pendapatan...</p> : panelErrors.trend ? (
            <PanelError message={panelErrors.trend} label="Muat ulang tren pendapatan" onRetry={() => retryPanel('trend')} />
          ) : chartsReady && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
              <AreaChart data={trend} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A365D" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#1A365D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '14px', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)' }}
                  formatter={(v, name) => [rupiah(v), name === 'receivable' ? 'Belum dibayar' : 'Pendapatan lunas']}
                  labelStyle={{ color: '#1A365D', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#1A365D" strokeWidth={3} fill="url(#gradRev)" />
                <Area type="monotone" dataKey="receivable" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                <TrendingUp size={24} className="text-slate-400" />
              </div>
              <p className="font-bold">{chartsReady ? 'Belum ada pendapatan tercatat di periode ini' : 'Memuat grafik...'}</p>
            </div>
          )}
        </div>
        <p className="mt-4 text-xs text-slate-500 font-medium flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center gap-2"><span className="w-4 h-0.5 bg-primary inline-block" /> Pendapatan lunas (Tunai + QRIS)</span>
          <span className="inline-flex items-center gap-2"><span className="w-4 border-t-2 border-dashed border-amber-500 inline-block" /> Bayar Nanti (belum dibayar)</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-xl font-black text-primary mb-6 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Wallet size={20} /></div>
            Metode Pembayaran
          </h3>
          <div className="w-full min-w-0 relative">
            {chartsReady && paymentTotal > 0 ? (
              <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={stats.paymentStats.filter((p) => p.amount > 0)}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={6}
                    dataKey="amount" nameKey="name" stroke="none"
                  >
                    {stats.paymentStats.filter((p) => p.amount > 0).map((entry) => (
                      <Cell key={entry.name} fill={PAYMENT_META[entry.name]?.color || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '14px' }}
                    formatter={(v, name) => [rupiah(v), PAYMENT_META[name]?.label || name]}
                  />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: '12px' }} formatter={(name) => PAYMENT_META[name]?.label || name} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <FileText size={24} className="text-slate-400" />
                </div>
                <p className="font-bold">{chartsReady ? 'Belum ada data transaksi tercatat' : 'Memuat grafik...'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-lg sm:text-xl font-black text-primary mb-4 sm:mb-6 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Clock size={20} /></div>
            Status Pengerjaan
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {stats.statusStats.map((s) => {
              const pct = Math.round((s.value / statusTotal) * 100);
              return (
                <div key={s.name}>
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-primary mb-1.5">
                    <span>{s.name}</span>
                    <span className="font-black">{s.value} <span className="text-slate-400 font-medium ml-1">({pct}%)</span></span>
                  </div>
                  <div className="h-2.5 sm:h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`${STATUS_COLORS[s.name] || 'bg-slate-400'} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-lg sm:text-xl font-black text-primary mb-4 sm:mb-6 flex items-center gap-3">
            <div className="p-2 bg-tertiary/20 rounded-lg text-tertiary-hover"><Trophy size={20} /></div>
            Layanan Terlaris
          </h3>
          {panelLoading.top ? <p role="status">Memuat layanan terlaris...</p> : panelErrors.top ? (
            <PanelError message={panelErrors.top} label="Muat ulang layanan terlaris" onRetry={() => retryPanel('top')} />
          ) : topServices.length === 0 ? (
            <p className="text-sm text-slate-500 font-medium py-10 text-center">Belum ada layanan terjual di periode ini.</p>
          ) : (
            <ol className="space-y-4">
              {topServices.map((s, index) => (
                <li key={s.name}>
                  <div className="flex justify-between items-baseline gap-3 text-xs sm:text-sm font-bold text-primary mb-1.5">
                    <span className="truncate"><span className="text-slate-400 mr-2">{index + 1}.</span>{s.name}</span>
                    <span className="font-black whitespace-nowrap">{rupiah(s.revenue)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((s.revenue / topRevenueMax) * 100)}%` }}></div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    {s.orders} pesanan{s.qty > 0 && s.unit ? ` · ${s.qty.toLocaleString('id-ID')} ${s.unit}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-50">
          <h3 className="text-xl font-black text-primary">Pesanan Masuk (Hari Ini)</h3>
          {canReport && <Link to="/reports" className="text-sm font-bold text-primary hover:text-tertiary transition-colors flex items-center gap-1">
            Lihat Semua Laporan <ArrowRight size={16} />
          </Link>}
        </div>

        {dateFilter === 'hari_ini' ? (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
              <thead className="bg-primary/5 text-primary font-black border-b border-slate-200">
                <tr>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">Waktu</th>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">Pelanggan</th>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">Layanan</th>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">Pembayaran</th>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-right">Tagihan</th>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stats.todayOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 sm:px-6 md:px-8 py-8 sm:py-10 text-center text-slate-500 font-medium text-xs sm:text-sm">Belum ada pesanan masuk hari ini.</td>
                  </tr>
                ) : (
                  stats.todayOrders.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 font-bold text-slate-500">
                        {new Date(t.startDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
                      </td>
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 font-black text-primary truncate">{t.customerName || '-'}</td>
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 truncate">{t.serviceName}</td>
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">
                        <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${t.paymentMethod === 'BAYAR_NANTI' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {PAYMENT_META[t.paymentMethod]?.label || t.paymentMethod}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-right">
                        <span className="font-black text-emerald-600 text-xs sm:text-sm">{rupiah(t.payableAmount ?? t.totalPrice)}</span>
                        {t.coveredAmount > 0 && (
                          <span className="block text-[10px] text-slate-400 font-medium">Membership −{rupiah(t.coveredAmount)}</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">
                        <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${STATUS_BADGES[t.status] || 'bg-slate-100 text-slate-600'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center bg-slate-50">
            <AlertCircle size={48} className="text-slate-300 mb-4" />
            <h4 className="text-lg font-bold text-slate-600 mb-2">Riwayat Di Luar Jangkauan Hari Ini</h4>
            <p className="text-slate-500 max-w-md text-sm">Anda sedang memfilter tanggal selain Hari Ini. Untuk melihat daftar pesanan secara lengkap, silakan tuju halaman laporan.</p>
            {canReport && <Link to="/reports" className="mt-4 px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-light transition-colors">
              Buka Laporan
            </Link>}
          </div>
        )}
      </div>
    </div>
  );
}

function getDelta(current, previous) {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return current > 0 ? { text: 'Baru', direction: 'up' } : { text: '0%', direction: 'flat' };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { text: `${Math.abs(pct)}%`, direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

const TONE_MAP = {
  primary: { iconBg: 'bg-primary/10', iconText: 'text-primary', barColor: 'bg-primary', glow: 'group-hover:shadow-primary/20' },
  tertiary: { iconBg: 'bg-tertiary/20', iconText: 'text-tertiary-hover', barColor: 'bg-tertiary', glow: 'group-hover:shadow-tertiary/20' },
  amber: { iconBg: 'bg-amber-100', iconText: 'text-amber-600', barColor: 'bg-amber-500', glow: 'group-hover:shadow-amber-500/20' },
  emerald: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', barColor: 'bg-emerald-500', glow: 'group-hover:shadow-emerald-500/20' },
  danger: { iconBg: 'bg-red-100', iconText: 'text-red-600', barColor: 'bg-red-500', glow: 'group-hover:shadow-red-500/20' },
  slate: { iconBg: 'bg-slate-100', iconText: 'text-slate-600', barColor: 'bg-slate-400', glow: 'group-hover:shadow-slate-400/20' },
};

const DELTA_STYLES = {
  up: 'text-emerald-600',
  down: 'text-rose-600',
  flat: 'text-slate-400',
};

function StatCard({ icon, label, value, sub, delta, deltaLabel, tone = 'primary', isClickable }) {
  const t = TONE_MAP[tone] || TONE_MAP.primary;
  const DeltaIcon = delta?.direction === 'down' ? TrendingDown : TrendingUp;
  return (
    <div className={`group relative bg-white rounded-[2rem] p-5 sm:p-7 border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-xl ${t.glow} ${isClickable ? 'hover:border-primary/20' : ''} flex flex-col justify-between min-h-[160px] sm:min-h-[180px] h-full`}>
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${t.iconBg} ${t.iconText} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-4 sm:mb-6`}>
        {icon}
      </div>

      <div className="space-y-1 sm:space-y-2">
        <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] leading-none">{label}</p>
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-primary break-words leading-tight">{value}</h2>
        {delta && (
          <p className={`text-[11px] font-bold flex items-center gap-1 ${DELTA_STYLES[delta.direction]}`}>
            {delta.direction !== 'flat' && <DeltaIcon size={12} />}
            {delta.text} <span className="text-slate-400 font-medium">vs {deltaLabel}</span>
          </p>
        )}
        {sub && <p className="text-[11px] text-slate-500 font-medium">{sub}</p>}
      </div>

      <div className={`absolute -bottom-2 -right-2 w-16 h-16 ${t.barColor} opacity-[0.03] rounded-full blur-xl group-hover:opacity-[0.1] transition-opacity duration-500`}></div>
    </div>
  );
}

const VALUE_TONES = { ok: 'text-emerald-600', bad: 'text-rose-600' };
const SUB_TONES = { warn: 'text-amber-600', bad: 'text-rose-600' };

function MiniMetric({ icon, label, value, sub, valueTone, subTone }) {
  return (
    <div className="p-5 sm:p-6 border-b border-slate-100 lg:border-b-0 min-w-0">
      <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className={`mt-2 text-base sm:text-lg font-black break-words ${VALUE_TONES[valueTone] || 'text-primary'}`}>{value}</p>
      {sub && <p className={`text-[11px] font-medium mt-0.5 ${SUB_TONES[subTone] || 'text-slate-500'}`}>{sub}</p>}
    </div>
  );
}

function PanelError({ message, label, onRetry }) {
  return <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">
    <p>{message}</p><button type="button" onClick={onRetry} className="mt-2 font-bold underline">{label}</button>
  </div>;
}
