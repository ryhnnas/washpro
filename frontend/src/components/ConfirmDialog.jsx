import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function ConfirmDialog({
  isOpen,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya, Lanjutkan',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (isOpen) cancelRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const variantClass = {
    danger: 'bg-rose-500 hover:bg-rose-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    primary: 'bg-primary hover:bg-primary-light text-white',
  }[confirmVariant] || 'bg-rose-500 hover:bg-rose-600 text-white';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center" aria-hidden="true">
            <AlertTriangle size={20} className="text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-black text-primary mb-1">{title}</h3>
            <p id="confirm-dialog-message" className="text-sm text-slate-500 leading-relaxed">{message}</p>
          </div>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Tutup dialog konfirmasi"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${variantClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
