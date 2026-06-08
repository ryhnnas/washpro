import { Power, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { STATUS_BADGE, STATUS_LABEL } from '../constants';

export default function BusinessesTab({ businesses, loading, onRefresh, onToggle, onDeleteRequest }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Manajemen Toko</h1>
          <p className="text-slate-400">Kelola seluruh tenant WashPro</p>
        </div>
        <button type="button" onClick={onRefresh} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors" aria-label="Muat ulang daftar toko">
          <RefreshCw size={16} />
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500" role="status" aria-live="polite">
          <Loader2 size={24} className="animate-spin mr-2" aria-hidden="true" /> Memuat...
        </div>
      ) : (
        <div className="space-y-3">
          {businesses.map((b) => (
            <div key={b.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-white font-bold">{b.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_BADGE[b.subscriptionStatus]}`}>
                    {STATUS_LABEL[b.subscriptionStatus]}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{b.users?.[0]?.name} · {b.users?.[0]?.email}</p>
                <div className="flex gap-4 mt-1 text-xs text-slate-600">
                  <span>{b._count?.transactions} transaksi</span>
                  <span>{b._count?.customers} pelanggan</span>
                  {b.subscriptionEndAt && <span>Aktif s/d {new Date(b.subscriptionEndAt).toLocaleDateString('id-ID')}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onToggle(b.id, b.subscriptionStatus)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    b.subscriptionStatus === 'SUSPENDED'
                      ? 'bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white'
                      : 'bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-white'
                  }`}
                >
                  <Power size={14} aria-hidden="true" />
                  {b.subscriptionStatus === 'SUSPENDED' ? 'Aktifkan' : 'Tangguhkan'}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRequest({ id: b.id, label: b.name })}
                  className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-sm font-semibold transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={14} aria-hidden="true" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
