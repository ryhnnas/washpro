import { useState, useEffect } from 'react';
import { RefreshCw, MapPin, Search, Package, Check, ArrowRight } from 'lucide-react';
import api from '../lib/axios';

const STATUS_CONFIG = {
  PENDING: {
    color: 'text-amber-500', 
    bg: 'bg-amber-100',
    border: 'border-amber-200',
    progress: '25%'
  },
  PROSES: {
    color: 'text-blue-500', 
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    progress: '50%'
  },
  SELESAI: {
    color: 'text-emerald-500', 
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    progress: '75%'
  },
  DIAMBIL: {
    color: 'text-slate-500', 
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    progress: '100%'
  }
};

const NEXT_STATUS = {
  PENDING: 'PROSES',
  PROSES: 'SELESAI',
  SELESAI: 'DIAMBIL',
  DIAMBIL: null
};

export default function Tracking() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleUpdateStatus = async (id, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    try {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: next } : t));
      await api.patch(`/transactions/${id}/status`, { status: next });
    } catch (err) {
      alert("Gagal update status");
      fetchTransactions();
    }
  };

  const filtered = filter === 'ALL' ? transactions : transactions.filter(t => t.status === filter);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-primary tracking-tight">Status Pengerjaan</h1>
           <p className="text-slate-500 mt-1 font-medium">Pantau & perbarui status pesanan seketika.</p>
        </div>
        <button 
          onClick={fetchTransactions}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 shadow-sm text-primary rounded-xl hover:bg-slate-50 transition-all active:scale-95"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span className="font-bold text-sm">Segarkan</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
        {['ALL', 'PENDING', 'PROSES', 'SELESAI', 'DIAMBIL'].map(st => (
           <button
             key={st}
             onClick={() => setFilter(st)}
             className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap border ${
               filter === st 
                 ? 'bg-primary text-secondary border-primary shadow-lg shadow-primary/20' 
                 : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
             }`}
           >
             {st === 'ALL' ? 'Semua Status' : st}
           </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
        {filtered.length === 0 && !loading && (
          <div className="md:col-span-2 xl:col-span-3 pb-8 pt-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-3xl bg-white/50">
            <div className="w-16 h-16 bg-white rounded-full border border-slate-200 flex items-center justify-center mb-4"><Search size={24} className="text-slate-400"/></div>
            <p className="text-slate-500 font-bold text-lg">Horee! Tidak ada antrian transaksi.</p>
          </div>
        )}
        
        {filtered.map(t => {
          const config = STATUS_CONFIG[t.status];
          const isDone = t.status === 'DIAMBIL';
          
          return (
            <div key={t.id} className="glass-card bg-white p-6 rounded-3xl hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
              {/* Progress Bar Background */}
              <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full">
                 <div className={`h-full ${config.bg.replace('100', '400')} transition-all duration-700`} style={{ width: config.progress }}></div>
              </div>

              <div className="flex justify-between items-start mb-5">
                 <div>
                   <h3 className="text-lg font-black text-primary mb-1 truncate pr-2 max-w-[180px]" title={t.customerName}>
                     {t.customerName || 'Pelanggan Walk-in'}
                   </h3>
                   <div className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 w-max px-2.5 py-1 rounded-md">
                     <Package size={12}/> {t.serviceName}
                   </div>
                 </div>
                 <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border ${config.bg} ${config.color} ${config.border}`}>
                   {t.status}
                 </span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-semibold">Total Tagihan</span>
                  <span className="text-primary font-black">Rp {t.totalPrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-semibold">Tanggal Masuk</span>
                  <span className="text-primary font-bold">{new Date(t.startDate).toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              {/* Action Button */}
              {NEXT_STATUS[t.status] ? (
                 <button 
                   onClick={() => handleUpdateStatus(t.id, t.status)}
                   className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 group/btn"
                 >
                   Pindahkan ke {NEXT_STATUS[t.status]} 
                   <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform"/>
                 </button>
              ) : (
                 <div className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-100 text-slate-500 font-bold rounded-xl border border-slate-200">
                   <Check size={18}/> Transaksi Selesai Total
                 </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
