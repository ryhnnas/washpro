import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, FileText, TrendingUp, Sparkles } from 'lucide-react';
import api from '../lib/axios';

const COLORS = ['#1A365D', '#FFD700']; // Primary and Tertiary

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    paymentStats: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-2">
              Dashboard <Sparkles className="text-tertiary" size={24} />
           </h1>
           <p className="text-primary-light mt-1 font-medium">Ringkasan performa bisnis Anda hari ini.</p>
        </div>
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
    </div>
  );
}
