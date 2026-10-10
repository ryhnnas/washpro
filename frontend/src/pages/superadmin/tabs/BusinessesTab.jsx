import { useEffect, useState } from 'react';
import { Power, Trash2, Loader2, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { STATUS_BADGE, STATUS_LABEL } from '../constants';
import Pagination from '../components/Pagination';

const STATUS_OPTIONS = ['TRIAL', 'ACTIVE', 'PENDING_PAYMENT', 'EXPIRED', 'SUSPENDED'];

export default function BusinessesTab({
  businesses, loading, error, query, total, limit, onQueryChange, onRefresh, onToggle, onDeleteRequest,
}) {
  const [searchInput, setSearchInput] = useState(query.search);

  useEffect(() => {
    if (searchInput === query.search) return undefined;
    const timer = setTimeout(() => onQueryChange({ search: searchInput, page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [searchInput, query.search, onQueryChange]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Manajemen Toko</h1>
          <p className="text-slate-400">Kelola seluruh tenant WashPro{total ? ` · ${total} toko` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama toko…"
              aria-label="Cari nama toko"
              className="w-full sm:w-52 pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-400"
            />
          </div>
          <select
            value={query.status}
            onChange={(e) => onQueryChange({ status: e.target.value, page: 1 })}
            aria-label="Filter status toko"
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Semua status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button type="button" onClick={onRefresh} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors" aria-label="Muat ulang daftar toko">
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
      ) : businesses.length === 0 && !error ? (
        <div className="text-center py-16 text-slate-600">Tidak ada toko yang cocok dengan filter ini.</div>
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
                <div className="flex gap-4 mt-1 text-xs text-slate-600 flex-wrap">
                  <span>{b._count?.transactions} transaksi</span>
                  <span>{b._count?.customers} pelanggan</span>
                  {b.subscriptionEndAt && <span>Aktif s/d {new Date(b.subscriptionEndAt).toLocaleDateString('id-ID')}</span>}
                  {!b.subscriptionEndAt && b.trialEndAt && <span>Trial s/d {new Date(b.trialEndAt).toLocaleDateString('id-ID')}</span>}
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
                  <Trash2 size={14} aria-hidden="true" /> Nonaktifkan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={query.page} limit={limit} total={total} onPageChange={(page) => onQueryChange({ page })} />
    </div>
  );
}
