import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDateRange, getTrendRange, validateCustomDate } from '../src/utils/dateRange.js';
const now = new Date('2026-10-10T17:30:00Z');
test('seven days include today plus six preceding WIB days', () => {
  assert.deepEqual(getDateRange('7_hari', {}, now), { startDate: '2026-10-04T17:00:00.000Z', endDate: '2026-10-11T16:59:59.999Z' });
});
test('today yesterday and current month use the WIB calendar', () => {
  assert.deepEqual(getDateRange('hari_ini', {}, now), { startDate: '2026-10-10T17:00:00.000Z', endDate: '2026-10-11T16:59:59.999Z' });
  assert.deepEqual(getDateRange('kemarin', {}, now), { startDate: '2026-10-09T17:00:00.000Z', endDate: '2026-10-10T16:59:59.999Z' });
  assert.equal(getDateRange('bulan_ini', {}, now).startDate, '2026-09-30T17:00:00.000Z');
});
test('custom dates preserve leap days and month transitions', () => {
  assert.deepEqual(getDateRange('kustom', { start: '2028-02-29', end: '2028-03-01' }), { startDate: '2028-02-28T17:00:00.000Z', endDate: '2028-03-01T16:59:59.999Z' });
  assert.equal(getDateRange('hari_ini', {}, new Date('2026-12-31T17:00:00Z')).endDate, '2027-01-01T16:59:59.999Z');
});
test('custom ranges must be complete real dates in chronological order', () => {
  for (const dates of [{ start: '', end: '' }, { start: '2026-02-30', end: '2026-03-01' }, { start: '2026-03-02', end: '2026-03-01' }]) {
    assert.ok(validateCustomDate(dates)); assert.throws(() => getDateRange('kustom', dates), RangeError);
  }
});
test('single day trend expands to seven WIB days but wider ranges are retained', () => {
  assert.deepEqual(getTrendRange(getDateRange('hari_ini', {}, now)), { startDate: '2026-10-04T17:00:00.000Z', endDate: '2026-10-11T16:59:59.999Z' });
  const month = getDateRange('bulan_ini', {}, now); assert.deepEqual(getTrendRange(month), month);
});
