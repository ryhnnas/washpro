import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

function DeleteForm({ confirmModal, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === confirmModal.label.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title">
      <form
        className="bg-slate-900 rounded-2xl p-6 max-w-md w-full"
        onSubmit={(e) => { e.preventDefault(); if (matches) onConfirm(confirmModal.id, typed.trim()); }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-500/20 rounded-xl"><AlertTriangle size={24} className="text-red-400" aria-hidden="true" /></div>
          <div>
            <h3 id="confirm-delete-title" className="text-white font-bold">Nonaktifkan Toko?</h3>
            <p className="text-slate-400 text-sm">Toko tidak bisa login lagi.</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm mb-4">
          Toko <strong className="text-white">{confirmModal.label}</strong> akan dinonaktifkan dan disembunyikan dari daftar.
          Data transaksi, pelanggan, dan layanan tetap tersimpan dan dapat dipulihkan oleh tim teknis.
        </p>
        <label htmlFor="confirm-delete-name" className="block text-xs font-semibold text-slate-400 mb-2">
          Ketik nama toko persis untuk melanjutkan
        </label>
        <input
          id="confirm-delete-name"
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="w-full mb-6 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-red-400"
          placeholder={confirmModal.label}
        />
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-semibold">Batal</button>
          <button
            type="submit"
            disabled={!matches}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={16} aria-hidden="true" /> Nonaktifkan
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ConfirmDeleteModal({ confirmModal, onCancel, onConfirm }) {
  if (!confirmModal) return null;
  return <DeleteForm key={confirmModal.id} confirmModal={confirmModal} onCancel={onCancel} onConfirm={onConfirm} />;
}
