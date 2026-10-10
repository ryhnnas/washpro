const rupiah = value => `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`;
export function classifyWhatsAppOutcome(result) {
  if (result?.queued) return 'queued';
  if (result?.ok) return 'sent';
  if (result?.skipped) return 'skipped';
  return 'failed';
}
export function buildCashierReceipt(transaction, businessName) {
  const details = (transaction.lineItems || []).map((item, i) => `${i + 1}. ${item.serviceName} — ${item.qty} ${item.unit || ''}`).join('\n');
  const estimate = transaction.estimatedCompletionAt
    ? `${new Date(transaction.estimatedCompletionAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })} WIB` : 'Belum tersedia';
  return `*${businessName || 'WashPro'}*\nNota #${transaction.id}\nHalo *${transaction.customerName}*,\n\n${details}\n\nSubtotal: ${rupiah(transaction.totalPrice)}\nPotongan Membership: ${rupiah(transaction.coveredAmount)}\nTagihan: ${rupiah(transaction.payableAmount ?? transaction.totalPrice)}\nPembayaran: ${transaction.paymentMethod === 'BAYAR_NANTI' ? 'Belum dibayar (Bayar Nanti)' : transaction.paymentMethod === 'QRIS' ? 'QRIS' : 'Tunai'}\nEstimasi selesai: ${estimate}\n\nTerima kasih.`;
}
