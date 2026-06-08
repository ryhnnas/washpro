import { X } from 'lucide-react';

export default function PlanModal({ planModal, setPlanModal, onSave, onClose }) {
  if (!planModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-modal-title"
      onClick={onClose}
    >
      <div className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 id="plan-modal-title" className="text-white font-bold text-lg">{planModal.id ? 'Edit Paket Berlangganan' : 'Tambah Paket Baru'}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Tutup dialog paket">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label htmlFor="plan-name" className="block text-slate-300 text-xs font-bold mb-1.5">Nama Paket</label>
            <input
              id="plan-name"
              type="text"
              value={planModal.name}
              onChange={(e) => setPlanModal({ ...planModal, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-price" className="block text-slate-300 text-xs font-bold mb-1.5">Harga (Rp)</label>
              <input
                id="plan-price"
                type="number"
                value={planModal.price}
                onChange={(e) => setPlanModal({ ...planModal, price: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="plan-duration" className="block text-slate-300 text-xs font-bold mb-1.5">Masa Aktif (Hari)</label>
              <input
                id="plan-duration"
                type="number"
                value={planModal.durationDays}
                onChange={(e) => setPlanModal({ ...planModal, durationDays: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="plan-features" className="block text-slate-300 text-xs font-bold mb-1.5">Daftar Fitur (Satu fitur per baris)</label>
            <textarea
              id="plan-features"
              rows={4}
              value={planModal.features}
              onChange={(e) => setPlanModal({ ...planModal, features: e.target.value })}
              placeholder={'Kasir Tanpa Batas\nLaporan Keuangan\nManajemen Staf'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
              required
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActivePlan"
              checked={planModal.isActive}
              onChange={(e) => setPlanModal({ ...planModal, isActive: e.target.checked })}
              className="w-4 h-4 rounded bg-white/5 border-white/10 text-indigo-500 focus:ring-0"
            />
            <label htmlFor="isActivePlan" className="text-slate-300 text-sm font-semibold cursor-pointer">Status Paket Aktif (Bisa dibeli tenant)</label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-semibold text-sm">Batal</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold transition-colors text-sm">Simpan Paket</button>
          </div>
        </form>
      </div>
    </div>
  );
}
