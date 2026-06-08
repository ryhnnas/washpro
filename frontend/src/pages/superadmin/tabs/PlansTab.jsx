import { Plus, Edit, Check, Loader2, RefreshCw } from 'lucide-react';
import { formatIDR } from '../constants';

export default function PlansTab({ plans, loading, onRefresh, onAdd, onEdit }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Paket Berlangganan</h1>
          <p className="text-slate-400">Kelola harga, durasi, dan fitur paket POS</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-all flex items-center gap-2 text-sm"
          >
            <Plus size={16} aria-hidden="true" /> Tambah Paket
          </button>
          <button type="button" onClick={onRefresh} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors" aria-label="Muat ulang daftar paket">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500" role="status" aria-live="polite">
          <Loader2 size={24} className="animate-spin mr-2" aria-hidden="true" /> Memuat paket...
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-slate-600">Belum ada paket berlangganan.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${p.isActive ? 'bg-green-500/20 text-green-300 border-green-400/30' : 'bg-slate-500/20 text-slate-400 border-slate-400/30'}`}>
                    {p.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    aria-label={`Edit paket ${p.name}`}
                  >
                    <Edit size={16} />
                  </button>
                </div>
                <h3 className="text-xl font-black text-white mb-1">{p.name}</h3>
                <p className="text-2xl font-black text-indigo-400 mb-1">{formatIDR(p.price)}</p>
                <p className="text-xs text-slate-400 mb-4">{p.durationDays} hari masa aktif</p>

                {Array.isArray(p.features) && (
                  <div className="space-y-2 border-t border-white/5 pt-4 mb-4">
                    {p.features.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2 text-xs text-slate-300">
                        <Check size={14} className="text-green-400 flex-shrink-0" aria-hidden="true" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 flex justify-between">
                <span>ID: {p.id.substring(0, 8)}...</span>
                <span>Diperbarui: {new Date(p.updatedAt).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
