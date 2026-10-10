import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatWibDate, formatWibDateKey } from '../src/utils/dateRange.js';
test('report labels and filename dates follow WIB at the UTC day boundary', () => {
  assert.equal(formatWibDate('2026-10-10T17:00:00Z'), '11/10/2026');
  assert.equal(formatWibDateKey('2026-10-10T17:00:00Z'), '2026-10-11');
});
