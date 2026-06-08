import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, Package, Check, ArrowRight, MessageCircle, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/axios';
import ConfirmDialog from '../components/ConfirmDialog';

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

const LIMIT = 30;

export default function Tracking() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, currentStatus: null });

  const fetchTransactions = useCallback(async (currentPage) => {
    setLoading(true);
    try {
      const res = await api.get(`/transactions?limit=${LIMIT}&page=${currentPage}`);
      setTransactions(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      const overdueRes = await api.get('/transactions/overdue');
      setOverdueCount(overdueRes.data?.total || 0);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchTransactions(page);
    }, 0);
    return () => clearTimeout(t);
  }, [page, fetchTransactions]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleUpdateStatus = async (id, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    // Buka confirm dialog, eksekusi setelah konfirmasi
    setConfirmDialog({ isOpen: true, id, currentStatus });
  };

  const handleConfirmStatusUpdate = async () => {
    const { id, currentStatus } = confirmDialog;
    const next = NEXT_STATUS[currentStatus];
    setConfirmDialog({ isOpen: false, id: null, currentStatus: null });
    try {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: next } : t));
      const res = await api.patch(`/transactions/${id}/status`, { status: next });
      const wa = res.data?.whatsapp;
      if (wa?.ok) {
        showToast('success', `Status diperbarui ke ${next} — notifikasi WA terkirim ke pelanggan.`);
      } else if (wa?.skipped) {
        showToast('info', `Status diperbarui ke ${next}. (WA dilewati: ${wa.reason})`);
      } else if (wa?.error) {
        showToast('warning', `Status diperbarui, namun WA gagal: ${wa.error}`);
      } else {
        showToast('success', `Status berhasil diubah ke ${next}.`);
      }
    } catch {
      showToast('error', 'Gagal update status');
      fetchTransactions(page);
    }
  };


  const filtered = filter === 'ALL'
    ? transactions
    : filter === 'TERLAMBAT'
      ? transactions.filter((t) => t.isOverdue)
      : transactions.filter(t => t.status === filter);

  const toastTone = {
    success: 'bg-emerald-500',
    info: 'bg-slate-700',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {toast && (
        <div className={`fixed top-24 right-6 z-[120] px-5 py-3 rounded-2xl text-white font-bold shadow-xl ${toastTone[toast.type] || 'bg-slate-700'} animate-in fade-in slide-in-from-top-2 max-w-md`}>
          <div className="flex items-center gap-2 text-sm">
            <MessageCircle size={18}/> {toast.message}
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-primary tracking-tight">Status Pengerjaan</h1>
           <p className="text-slate-500 mt-1 font-medium">Pantau & perbarui status pesanan seketika.</p>
           {overdueCount > 0 && (
             <p className="mt-2 text-rose-600 font-bold text-sm">{overdueCount} transaksi melewati estimasi dan belum selesai.</p>
           )}
        </div>
        <button 
          onClick={() => fetchTransactions(page)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 shadow-sm text-primary rounded-xl hover:bg-slate-50 transition-all active:scale-95"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span className="font-bold text-sm">Segarkan</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
        {['ALL', 'TERLAMBAT', 'PENDING', 'PROSES', 'SELESAI', 'DIAMBIL'].map(st => (
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
                {t.isOverdue && (
                  <span className="ml-2 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                    TERLAMBAT
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-semibold">Total Tagihan</span>
                  <span className="text-primary font-black">Rp {t.totalPrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-semibold">Tanggal Masuk</span>
                  <span className="text-primary font-bold">{new Date(t.startDate).toLocaleDateString('id-ID')}</span>
                </div>
                {t.estimatedCompletionAt && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-semibold">Estimasi Selesai</span>
                    <span className={`font-bold ${t.isOverdue ? 'text-rose-600' : 'text-primary'}`}>
                      {new Date(t.estimatedCompletionAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                {t.customerPhone && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Phone size={12}/> Kontak</span>
                    <span className="text-primary font-bold">{t.customerPhone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
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
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => { setLoading(true); setPage(p => p - 1); }}
            className="p-2 rounded-xl border border-slate-200 bg-white text-primary hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold text-slate-500 min-w-[100px] text-center">
            Halaman {page} dari {totalPages}
          </span>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => { setLoading(true); setPage(p => p + 1); }}
            className="p-2 rounded-xl border border-slate-200 bg-white text-primary hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Perbarui Status Pesanan"
        message={`Pindahkan pesanan ini ke status "${NEXT_STATUS[confirmDialog.currentStatus]}"? Notifikasi WhatsApp akan dikirim ke pelanggan jika diaktifkan.`}
        confirmLabel="Ya, Pindahkan"
        confirmVariant="primary"
        onConfirm={handleConfirmStatusUpdate}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null, currentStatus: null })}
      />
    </div>
  );
}
