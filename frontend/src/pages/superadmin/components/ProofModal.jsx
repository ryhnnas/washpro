import { X, CheckCircle, XCircle } from 'lucide-react';
import { formatIDR } from '../constants';

export default function ProofModal({ proofModal, apiBase, onClose, onApprove, onReject }) {
  if (!proofModal) return null;

  const imageUrl = proofModal.url.startsWith('/uploads')
    ? `${apiBase.replace('/api', '')}${proofModal.url}`
    : proofModal.url;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-modal-title"
      onClick={onClose}
    >
      <div className="bg-slate-900 rounded-2xl p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 id="proof-modal-title" className="text-white font-bold">Bukti Pembayaran</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Tutup dialog bukti pembayaran">
            <X size={20} />
          </button>
        </div>
        <img src={imageUrl} alt="Bukti transfer pembayaran" className="w-full rounded-xl max-h-96 object-contain bg-white" />
        <div className="mt-3 text-slate-400 text-sm space-y-1">
          <p>Toko: <span className="text-white font-semibold">{proofModal.businessName}</span></p>
          <p>Paket: <span className="text-white">{proofModal.planName}</span></p>
          <p>Nominal: <span className="text-white font-bold">{formatIDR(proofModal.amount)}</span></p>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={() => { onApprove(proofModal.id); onClose(); }} className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
            <CheckCircle size={16} aria-hidden="true" /> Approve
          </button>
          <button type="button" onClick={() => { onReject(proofModal.id, 'Bukti tidak valid'); onClose(); }} className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
            <XCircle size={16} aria-hidden="true" /> Tolak
          </button>
        </div>
      </div>
    </div>
  );
}
