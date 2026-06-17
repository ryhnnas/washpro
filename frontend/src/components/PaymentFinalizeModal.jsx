import { X, CreditCard, Wallet, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function PaymentFinalizeModal({
  isOpen,
  totalPrice = 0,
  customerName = '',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [selectedMethod, setSelectedMethod] = useState('CASH');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-primary">Finalisasi Pembayaran</h3>
            <p className="text-xs text-slate-500 font-medium">Pilih metode pembayaran final untuk {customerName || 'Pelanggan'}</p>
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Billing Summary */}
          <div className="bg-secondary/40 border border-slate-200/60 p-4 rounded-2xl flex items-center justify-between shadow-inner">
            <span className="text-sm text-slate-500 font-bold">Total yang Harus Dibayar</span>
            <span className="text-2xl font-black text-primary">
              Rp {totalPrice.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Payment Options */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
              Metode Pembayaran Final
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Cash Option */}
              <button
                type="button"
                disabled={loading}
                onClick={() => setSelectedMethod('CASH')}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300 gap-2.5 ${
                  selectedMethod === 'CASH'
                    ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className={`p-3 rounded-full ${selectedMethod === 'CASH' ? 'bg-primary/10' : 'bg-slate-100'}`}>
                  <Wallet size={24} className={selectedMethod === 'CASH' ? 'text-primary' : 'text-slate-500'} />
                </div>
                <span className="font-bold text-sm">Tunai (CASH)</span>
              </button>

              {/* QRIS Option */}
              <button
                type="button"
                disabled={loading}
                onClick={() => setSelectedMethod('QRIS')}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300 gap-2.5 ${
                  selectedMethod === 'QRIS'
                    ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className={`p-3 rounded-full ${selectedMethod === 'QRIS' ? 'bg-primary/10' : 'bg-slate-100'}`}>
                  <CreditCard size={24} className={selectedMethod === 'QRIS' ? 'text-primary' : 'text-slate-500'} />
                </div>
                <span className="font-bold text-sm">Digital (QRIS)</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex gap-2 items-start font-medium leading-relaxed">
            <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <span>
              Menyelesaikan pembayaran akan langsung menandai cucian sebagai <strong>DIAMBIL</strong> dan mengirimkan notifikasi status selesai ke pelanggan (jika aktif).
            </span>
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
            type="button"
            disabled={loading}
            onClick={() => onConfirm(selectedMethod)}
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-light active:scale-98 transition-all disabled:opacity-50 shadow-md shadow-primary/10"
          >
            {loading ? 'Memproses...' : 'Konfirmasi & Selesai'}
          </button>
        </div>
      </div>
    </div>
  );
}
