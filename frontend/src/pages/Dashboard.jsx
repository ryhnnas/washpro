import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, FileText, TrendingUp, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import DateFilter, { getDateRange } from '../components/DateFilter';

const COLORS = ['#1A365D', '#FFD700']; // Primary and Tertiary

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    paymentStats: [],
    todayOrders: []
  });

  const [dateFilter, setDateFilter] = useState('hari_ini');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { startDate, endDate } = getDateRange(dateFilter, customDate);
        // Only fetch if customDate is fully set when on kustom
        if (dateFilter === 'kustom' && (!customDate.start || !customDate.end)) return;

        const res = await api.get(`/dashboard/stats?startDate=${startDate}&endDate=${endDate}`);
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
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

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 md:p-8 rounded-3xl flex items-center gap-6 group hover:-translate-y-2 transition-all duration-300 relative overflow-hidden bg-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500 pointer-events-none"></div>
          <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
            <DollarSign size={32} />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-sm md:text-base uppercase tracking-wider mb-1">Total Pendapatan</p>
            <h2 className="text-3xl md:text-4xl font-black text-primary">Rp {stats.totalRevenue.toLocaleString('id-ID')}</h2>
          </div>
        </div>
        
        <div className="glass-card p-6 md:p-8 rounded-3xl flex items-center gap-6 group hover:-translate-y-2 transition-all duration-300 relative overflow-hidden bg-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500 pointer-events-none"></div>
          <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-tertiary to-[#d4b300] flex items-center justify-center text-primary shadow-lg shadow-tertiary/30 group-hover:scale-110 transition-transform duration-300">
            <FileText size={32} strokeWidth={2.5}/>
          </div>
          <div>
            <p className="text-slate-500 font-bold text-sm md:text-base uppercase tracking-wider mb-1">Total Transaksi</p>
            <h2 className="text-3xl md:text-4xl font-black text-primary">{stats.totalTransactions}</h2>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="glass-card p-6 md:p-8 rounded-3xl bg-white border border-slate-200">
        <h3 className="text-xl font-black text-primary mb-8 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary"><TrendingUp size={20} /></div>
          Metode Pembayaran (Cash vs QRIS)
        </h3>
        <div className="h-80 w-full relative">
          {stats.paymentStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.paymentStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.paymentStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: `drop-shadow(0px 10px 15px ${COLORS[index%COLORS.length]}40)` }} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '16px', color: '#1A365D', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1A365D', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: '20px' }} />
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
