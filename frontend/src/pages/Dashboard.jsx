import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign, FileText, TrendingUp, Sparkles, AlertCircle, ArrowRight, Clock, Users, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import DateFilter, { getDateRange } from '../components/DateFilter';

const PAYMENT_COLORS = ['#1A365D', '#FFD700'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    activeQueue: 0,
    totalCustomers: 0,
    paymentStats: [],
    statusStats: [],
    todayOrders: []
  });
  const [trend, setTrend] = useState([]);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);

  const [dateFilter, setDateFilter] = useState('hari_ini');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });

  useEffect(() => {
    const t = setTimeout(() => setChartsReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const { startDate, endDate } = getDateRange(dateFilter, customDate);
        if (dateFilter === 'kustom' && (!customDate.start || !customDate.end)) {
            setLoading(false);
            return;
        }

        const [statsRes, trendRes] = await Promise.all([
          api.get(`/dashboard/stats?startDate=${startDate}&endDate=${endDate}`),
          api.get(`/dashboard/revenue-trend?startDate=${startDate}&endDate=${endDate}`),
        ]);
        setStats(statsRes.data);
        setTrend(trendRes.data?.data || []);
        const overdueRes = await api.get('/transactions/overdue');
        setOverdueTotal(overdueRes.data?.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [dateFilter, customDate.start, customDate.end]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 bg-slate-200 rounded-3xl"></div>
          <div className="h-32 bg-slate-200 rounded-3xl"></div>
          <div className="h-32 bg-slate-200 rounded-3xl"></div>
          <div className="h-32 bg-slate-200 rounded-3xl"></div>
        </div>
        <div className="h-64 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

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

      {/* Stat Cards (4 cards: revenue, transactions, queue, customers) */}
      {/* Stat Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <StatCard
          icon={<DollarSign size={24} />}
          label="Pendapatan"
          value={`Rp ${stats.totalRevenue.toLocaleString('id-ID')}`}
          tone="primary"
        />
        <StatCard
          icon={<FileText size={24} />}
          label="Transaksi"
          value={stats.totalTransactions}
          tone="tertiary"
        />
        <StatCard
          icon={<Clock size={24} />}
          label="Antrian Aktif"
          value={stats.activeQueue || 0}
          tone="amber"
        />
        <StatCard
          icon={<Users size={24} />}
          label="Total Pelanggan"
          value={stats.totalCustomers || 0}
          tone="emerald"
        />
        <Link to="/tracking" className="block group/link">
          <StatCard
            icon={<TriangleAlert size={24} />}
            label="Keterlambatan"
            value={overdueTotal}
            tone={overdueTotal > 0 ? 'danger' : 'slate'}
            isClickable
          />
        </Link>
      </div>

      {/* Revenue Trend Chart - sesuai proposal: "grafik pendapatan" */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="text-xl font-black text-primary flex items-center gap-3">
            <div className="p-2 bg-tertiary/20 rounded-lg text-tertiary-hover"><TrendingUp size={20} /></div>
            Tren Pendapatan
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            {trend.length} hari periode
          </span>
        </div>
        <div className="w-full min-w-0">
          {chartsReady && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
              <AreaChart data={trend} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A365D" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#1A365D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '14px', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)' }}
                  formatter={(v) => [`Rp ${v.toLocaleString('id-ID')}`, 'Pendapatan']}
                  labelStyle={{ color: '#1A365D', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#1A365D" strokeWidth={3} fill="url(#gradRev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                <TrendingUp size={24} className="text-slate-400"/>
              </div>
              <p className="font-bold">{chartsReady ? 'Belum ada pendapatan tercatat di periode ini' : 'Memuat grafik...'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pie + Status grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-xl font-black text-primary mb-6 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><TrendingUp size={20} /></div>
            Cash vs QRIS
          </h3>
          <div className="w-full min-w-0 relative">
            {chartsReady && stats.paymentStats.length > 0 && (stats.paymentStats[0].value + stats.paymentStats[1].value) > 0 ? (
              <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={stats.paymentStats} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={6} dataKey="value" stroke="none">
                    {stats.paymentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '14px' }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[288px] flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <FileText size={24} className="text-slate-400"/>
                </div>
                <p className="font-bold">{chartsReady ? 'Belum ada data transaksi tercatat' : 'Memuat grafik...'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
          <h3 className="text-lg sm:text-xl font-black text-primary mb-4 sm:mb-6 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Clock size={20} /></div>
            Distribusi Status Pengerjaan
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {(stats.statusStats || []).map((s) => {
              const total = (stats.statusStats || []).reduce((a,b)=>a+b.value,0) || 1;
              const pct = Math.round((s.value/total)*100);
              const color = {
                PENDING: 'bg-amber-400',
                PROSES: 'bg-blue-400',
                SELESAI: 'bg-emerald-400',
                DIAMBIL: 'bg-slate-400'
              }[s.name] || 'bg-slate-400';
              return (
                <div key={s.name}>
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-primary mb-1.5">
                    <span>{s.name}</span>
                    <span className="font-black">{s.value} <span className="text-slate-400 font-medium ml-1">({pct}%)</span></span>
                  </div>
                  <div className="h-2.5 sm:h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pesanan Hari Ini */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-50">
          <h3 className="text-xl font-black text-primary">Pesanan Masuk (Hari Ini)</h3>
          <Link to="/reports" className="text-sm font-bold text-primary hover:text-tertiary transition-colors flex items-center gap-1">
            Lihat Semua Laporan <ArrowRight size={16} />
          </Link>
        </div>

        {dateFilter === 'hari_ini' ? (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
              <thead className="bg-primary/5 text-primary font-black border-b border-slate-200">
                <tr>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">Waktu</th>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">Pelanggan</th>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">Layanan</th>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-right">Nominal</th>
                  <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {!stats.todayOrders || stats.todayOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-3 sm:px-6 md:px-8 py-8 sm:py-10 text-center text-slate-500 font-medium text-xs sm:text-sm">Belum ada pesanan masuk hari ini.</td>
                  </tr>
                ) : (
                  stats.todayOrders.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 font-bold text-slate-500">
                        {new Date(t.startDate).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 font-black text-primary truncate">{t.customerName || '-'}</td>
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 truncate">{t.serviceName}</td>
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-right font-black text-emerald-600 text-xs sm:text-sm">Rp {t.totalPrice.toLocaleString('id-ID')}</td>
                      <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">
                        <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${t.status === 'SELESAI' || t.status === 'DIAMBIL' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
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
            <Link to="/reports" className="mt-4 px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-light transition-colors">
              Buka Laporan
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}

const TONE_MAP = {
  primary: { 
    iconBg: 'bg-primary/10', 
    iconText: 'text-primary', 
    barColor: 'bg-primary',
    glow: 'group-hover:shadow-primary/20'
  },
  tertiary: { 
    iconBg: 'bg-tertiary/20', 
    iconText: 'text-tertiary-hover', 
    barColor: 'bg-tertiary',
    glow: 'group-hover:shadow-tertiary/20'
  },
  amber: { 
    iconBg: 'bg-amber-100', 
    iconText: 'text-amber-600', 
    barColor: 'bg-amber-500',
    glow: 'group-hover:shadow-amber-500/20'
  },
  emerald: { 
    iconBg: 'bg-emerald-100', 
    iconText: 'text-emerald-600', 
    barColor: 'bg-emerald-500',
    glow: 'group-hover:shadow-emerald-500/20'
  },
  danger: { 
    iconBg: 'bg-red-100', 
    iconText: 'text-red-600', 
    barColor: 'bg-red-500',
    glow: 'group-hover:shadow-red-500/20'
  },
  slate: { 
    iconBg: 'bg-slate-100', 
    iconText: 'text-slate-600', 
    barColor: 'bg-slate-400',
    glow: 'group-hover:shadow-slate-400/20'
  },
};

function StatCard({ icon, label, value, tone = 'primary', isClickable }) {
  const t = TONE_MAP[tone] || TONE_MAP.primary;
  return (
    <div className={`group relative bg-white rounded-[2rem] p-5 sm:p-7 border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-xl ${t.glow} ${isClickable ? 'hover:border-primary/20' : ''} flex flex-col justify-between min-h-[160px] sm:min-h-[180px]`}>
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${t.iconBg} ${t.iconText} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-4 sm:mb-6`}>
        {icon}
      </div>
      
      <div className="space-y-1 sm:space-y-2">
        <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] leading-none">{label}</p>
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-primary break-words leading-tight">
          {value}
        </h2>
      </div>
      
      {/* Subtle background decoration */}
      <div className={`absolute -bottom-2 -right-2 w-16 h-16 ${t.barColor} opacity-[0.03] rounded-full blur-xl group-hover:opacity-[0.1] transition-opacity duration-500`}></div>
    </div>
  );
}
