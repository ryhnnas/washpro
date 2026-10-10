import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateCashierPreview } from '../src/utils/cashierPreview.js';
const service = { id: 's1', name: 'Cuci', unit: 'kg', price: 8000 };
const membership = { isActive: true, templateId: 'p1', balances: [{ serviceId: 's1', remainingQty: 10 }] };
const packages = [{ id: 'p1', items: [{ serviceId: 's1', deductionRate: 1 }] }];
test('duplicate services share quota and never mutate the customer', () => {
  const before = structuredClone(membership);
  const out = calculateCashierPreview([{ service, qty: 6 }, { service, qty: 6 }], membership, packages);
  assert.equal(out.totalPrice, 96000); assert.equal(out.coveredAmount, 80000); assert.equal(out.payableAmount, 16000);
  assert.deepEqual(membership, before);
});
test('deduction rate two consumes ten quota units for six kilograms', () => {
  const out = calculateCashierPreview([{ service, qty: 6 }], membership, [{ id: 'p1', items: [{ serviceId: 's1', deductionRate: 2 }] }]);
  assert.equal(out.coveredAmount, 40000); assert.equal(out.payableAmount, 8000);
});
test('rounds fractional duplicate quantities once after merging', () => {
  const out = calculateCashierPreview([{ service: { ...service, price: 10001 }, qty: 0.333 }, { service: { ...service, price: 10001 }, qty: 0.333 }], membership, packages);
  assert.equal(out.totalPrice, 6661); assert.equal(out.coveredAmount, 6661); assert.equal(out.payableAmount, 0);
});
for (const [name, member, pkgs] of [
  ['no membership', null, packages], ['inactive membership', { ...membership, isActive: false }, packages],
  ['missing template', membership, []], ['missing quota item', membership, [{ id: 'p1', items: [] }]],
  ['empty balance', { ...membership, balances: [{ serviceId: 's1', remainingQty: 0 }] }, packages],
  ['invalid rate', membership, [{ id: 'p1', items: [{ serviceId: 's1', deductionRate: -1 }] }]],
]) test(name + ' cannot promise membership coverage', () => {
  assert.equal(calculateCashierPreview([{ service, qty: 6 }], member, pkgs).payableAmount, 48000);
});
test('distinct services consume their own balances', () => {
  const out = calculateCashierPreview([{ service, qty: 12 }, { service: { ...service, id: 's2' }, qty: 2 }], membership, packages);
  assert.equal(out.coveredAmount, 80000); assert.equal(out.payableAmount, 32000);
});
