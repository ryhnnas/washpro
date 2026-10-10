import { Eye, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { formatIDR, STATUS_BADGE, STATUS_LABEL } from '../constants';
import Pagination from '../components/Pagination';

export default function PaymentsTab({
  payments,
  loading,
  error,
  page,
  total,
  limit,
  onPageChange,
  paymentFilter,
  setPaymentFilter,
  onRefresh,
  onViewProof,
}) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Verifikasi Pembayaran</h1>
          <p className="text-slate-400">Periksa dan konfirmasi bukti transfer QRIS</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPaymentFilter(s)}
              aria-pressed={paymentFilter === s}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${paymentFilter === s ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
          <button type="button" onClick={onRefresh} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors" aria-label="Muat ulang daftar pembayaran">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 bg-red-500/10 border border-red-400/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertCircle size={16} aria-hidden="true" /> {error}</span>
          <button type="button" onClick={onRefresh} className="font-semibold underline">Coba lagi</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500" role="status" aria-live="polite">
          <Loader2 size={24} className="animate-spin mr-2" aria-hidden="true" /> Memuat...
        </div>
      ) : payments.length === 0 && !error ? (
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
                  type="button"
                  onClick={() => onViewProof(p)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Eye size={14} aria-hidden="true" /> Lihat Bukti
                </button>
                {p.status === 'PENDING' && (
                  <button type="button" onClick={() => onViewProof(p)} className="px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white text-sm font-semibold transition-all">
                    Tinjau & Putuskan
                  </button>
                )}
                {p.status === 'REJECTED' && p.rejectionReason && (
                  <span className="self-center text-xs text-slate-500 max-w-[14rem] truncate" title={p.rejectionReason}>
                    Alasan: {p.rejectionReason}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} limit={limit} total={total} onPageChange={onPageChange} />
    </div>
  );
}
