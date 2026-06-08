import { AlertTriangle, Trash2 } from 'lucide-react';

export default function ConfirmDeleteModal({ confirmModal, onCancel, onConfirm }) {
  if (!confirmModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title">
      <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-500/20 rounded-xl"><AlertTriangle size={24} className="text-red-400" aria-hidden="true" /></div>
          <div>
            <h3 id="confirm-delete-title" className="text-white font-bold">Hapus Toko Permanen?</h3>
            <p className="text-slate-400 text-sm">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm mb-6">Seluruh data toko <strong className="text-white">{confirmModal.label}</strong> termasuk transaksi, pelanggan, dan layanan akan dihapus permanen dari database.</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-semibold">Batal</button>
          <button type="button" onClick={() => onConfirm(confirmModal.id)} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-colors flex items-center justify-center gap-2">
            <Trash2 size={16} aria-hidden="true" /> Hapus Permanen
          </button>
        </div>
      </div>
    </div>
  );
}
