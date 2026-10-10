import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCashierReceipt, classifyWhatsAppOutcome } from '../src/utils/cashierReceipt.js';
const transaction = { id: 'tx-1', customerName: 'Budi', totalPrice: 48000, coveredAmount: 48000,
  payableAmount: 0, paymentMethod: 'CASH', estimatedCompletionAt: '2026-10-10T17:30:00Z',
  lineItems: [{ serviceName: 'Cuci', qty: 6, unit: 'kg' }] };
test('saved receipt preserves zero payable and displays membership separately', () => {
  const text = buildCashierReceipt(transaction, 'Laundry');
  assert.match(text, /Subtotal.*48\.000/); assert.match(text, /Membership.*48\.000/); assert.match(text, /Tagihan.*Rp 0/);
  assert.match(text, /Cuci.*6 kg/); assert.match(text, /00[.:]30.*WIB/);
});
test('deferred payment is not described as paid', () => {
  assert.match(buildCashierReceipt({ ...transaction, payableAmount: 16000, paymentMethod: 'BAYAR_NANTI' }, 'Laundry'), /Belum dibayar/);
});
for (const [input, expected] of [
  [{ ok: true }, 'sent'], [{ queued: true, error: 'offline' }, 'queued'], [{ skipped: true, reason: 'NO_PHONE' }, 'skipped'],
  [{ error: 'gateway' }, 'failed'], [undefined, 'failed'],
]) test('WhatsApp outcome ' + expected + ' is distinct', () => assert.equal(classifyWhatsAppOutcome(input), expected));
