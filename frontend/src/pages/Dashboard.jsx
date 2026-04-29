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

  const [dateFilter, setDateFilter] = useState('hari_ini');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { startDate, endDate } = getDateRange(dateFilter, customDate);
        if (dateFilter === 'kustom' && (!customDate.start || !customDate.end)) return;

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
      }
    };
    fetchAll();
  }, [dateFilter, customDate.start, customDate.end]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
        <StatCard
          icon={<DollarSign size={28} />}
          label="Total Pendapatan"
          value={`Rp ${stats.totalRevenue.toLocaleString('id-ID')}`}
          tone="primary"
        />
        <StatCard
          icon={<FileText size={28} strokeWidth={2.5}/>}
          label="Total Transaksi"
          value={stats.totalTransactions}
          tone="tertiary"
        />
        <StatCard
          icon={<Clock size={28} />}
          label="Antrian Aktif"
          value={stats.activeQueue || 0}
          tone="amber"
          hint="Status PENDING + PROSES"
        />
        <StatCard
          icon={<Users size={28} />}
          label="Total Pelanggan"
          value={stats.totalCustomers || 0}
          tone="emerald"
          hint="Database CRM bisnis"
        />
        <Link to="/tracking" className="block">
          <StatCard
            icon={<TriangleAlert size={28} />}
            label="Order Terlambat"
            value={overdueTotal}
            tone={overdueTotal > 0 ? 'amber' : 'primary'}
            hint={overdueTotal > 0 ? 'Perlu ditindaklanjuti' : 'Tidak ada keterlambatan'}
          />
        </Link>
      </div>

      {/* Revenue Trend Chart - sesuai proposal: "grafik pendapatan" */}
      <div className="glass-card p-6 md:p-8 rounded-3xl bg-white border border-slate-200">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="text-xl font-black text-primary flex items-center gap-3">
            <div className="p-2 bg-tertiary/20 rounded-lg text-tertiary-hover"><TrendingUp size={20} /></div>
            Tren Pendapatan
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            {trend.length} hari periode
          </span>
        </div>
        <div className="h-72 w-full">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
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
              <p className="font-bold">Belum ada pendapatan tercatat di periode ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Pie + Status grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6 md:p-8 rounded-3xl bg-white border border-slate-200">
          <h3 className="text-xl font-black text-primary mb-6 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><TrendingUp size={20} /></div>
            Cash vs QRIS
          </h3>
          <div className="h-72 w-full relative">
            {stats.paymentStats.length > 0 && (stats.paymentStats[0].value + stats.paymentStats[1].value) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <FileText size={24} className="text-slate-400"/>
                </div>
                <p className="font-bold">Belum ada data transaksi tercatat</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6 md:p-8 rounded-3xl bg-white border border-slate-200">
          <h3 className="text-xl font-black text-primary mb-6 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Clock size={20} /></div>
            Distribusi Status Pengerjaan
          </h3>
          <div className="space-y-4">
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
                  <div className="flex justify-between text-sm font-bold text-primary mb-1.5">
                    <span>{s.name}</span>
                    <span className="font-black">{s.value} <span className="text-slate-400 font-medium ml-1">({pct}%)</span></span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pesanan Hari Ini */}
      <div className="glass-card rounded-3xl bg-white border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-xl font-black text-primary">Pesanan Masuk (Hari Ini)</h3>
          <Link to="/reports" className="text-sm font-bold text-primary hover:text-tertiary transition-colors flex items-center gap-1">
            Lihat Semua Laporan <ArrowRight size={16} />
          </Link>
        </div>

        {dateFilter === 'hari_ini' ? (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-primary/5 text-primary font-black border-b border-slate-200">
                <tr>
                  <th className="px-8 py-4">Waktu</th>
                  <th className="px-8 py-4">Pelanggan</th>
                  <th className="px-8 py-4">Layanan</th>
                  <th className="px-8 py-4 text-right">Nominal</th>
                  <th className="px-8 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {!stats.todayOrders || stats.todayOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-10 text-center text-slate-500 font-medium">Belum ada pesanan masuk hari ini.</td>
                  </tr>
                ) : (
                  stats.todayOrders.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4 font-bold text-slate-500">
                        {new Date(t.startDate).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-8 py-4 font-black text-primary">{t.customerName || '-'}</td>
                      <td className="px-8 py-4">{t.serviceName}</td>
                      <td className="px-8 py-4 text-right font-black text-emerald-600">Rp {t.totalPrice.toLocaleString('id-ID')}</td>
                      <td className="px-8 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${t.status === 'SELESAI' || t.status === 'DIAMBIL' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
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
  primary: { iconBg: 'from-primary to-primary-light', iconText: 'text-white', shadow: 'shadow-primary/30', accentBg: 'bg-primary/5' },
  tertiary: { iconBg: 'from-tertiary to-[#d4b300]', iconText: 'text-primary', shadow: 'shadow-tertiary/30', accentBg: 'bg-tertiary/10' },
  amber: { iconBg: 'from-amber-400 to-amber-500', iconText: 'text-white', shadow: 'shadow-amber-500/30', accentBg: 'bg-amber-100' },
  emerald: { iconBg: 'from-emerald-400 to-emerald-600', iconText: 'text-white', shadow: 'shadow-emerald-500/30', accentBg: 'bg-emerald-100' },
};

function StatCard({ icon, label, value, tone = 'primary', hint }) {
  const t = TONE_MAP[tone] || TONE_MAP.primary;
  return (
    <div className="glass-card p-6 rounded-3xl flex items-center gap-5 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden bg-white">
      <div className={`absolute top-0 right-0 w-32 h-32 ${t.accentBg} rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500 pointer-events-none`}></div>
      <div className={`w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br ${t.iconBg} flex items-center justify-center ${t.iconText} shadow-lg ${t.shadow} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1 truncate">{label}</p>
        <h2 className="text-2xl lg:text-3xl font-black text-primary truncate">{value}</h2>
        {hint && <p className="text-[11px] text-slate-400 font-semibold mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  );
}
