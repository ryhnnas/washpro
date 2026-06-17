import { X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function CancelTransactionModal({
  isOpen,
  customerName = '',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [reasonCategory, setReasonCategory] = useState('SALAH_INPUT');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalReason = '';
    if (reasonCategory === 'SALAH_INPUT') {
      finalReason = 'Salah Input Data';
    } else if (reasonCategory === 'PELANGGAN_BATAL') {
      finalReason = 'Pelanggan Membatalkan';
    } else {
      finalReason = customReason.trim() || 'Lainnya';
    }
    onConfirm(finalReason);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-rose-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-primary">Batalkan Transaksi</h3>
              <p className="text-xs text-slate-500 font-medium">Cucian milik {customerName || 'Pelanggan'}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Alasan Pembatalan
              </label>
              <select
                disabled={loading}
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full p-3 bg-secondary border border-slate-200 rounded-xl outline-none text-primary font-bold shadow-inner"
              >
                <option value="SALAH_INPUT">Salah Input Data Kasir</option>
                <option value="PELANGGAN_BATAL">Permintaan Pelanggan Batal</option>
                <option value="LAINNYA">Lainnya (Tulis alasan sendiri)</option>
              </select>
            </div>

            {reasonCategory === 'LAINNYA' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Keterangan Alasan
                </label>
                <textarea
                  required
                  disabled={loading}
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Contoh: Salah pilih jenis paket cucian..."
                  className="w-full p-3 bg-secondary border border-slate-200 rounded-xl outline-none text-primary font-medium shadow-inner resize-none"
                />
              </div>
            )}

            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] font-bold leading-normal">
              ⚠️ Peringatan: Aksi pembatalan ini bersifat permanen. Jika transaksi menggunakan kuota membership, kuota akan otomatis dikembalikan ke saldo pelanggan.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 pb-6 flex gap-3 justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 active:scale-98 transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 active:scale-98 transition-all disabled:opacity-50 shadow-md shadow-rose-500/10"
            >
              {loading ? 'Membatalkan...' : 'Batalkan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
