const { getWibDayBounds } = require('../../src/utils/businessDate');
test.each([
  ['2026-10-10T17:30:00Z', '2026-10-10T17:00:00.000Z', '2026-10-11T16:59:59.999Z'],
  ['2026-10-10T16:59:59.999Z', '2026-10-09T17:00:00.000Z', '2026-10-10T16:59:59.999Z'],
  ['2026-12-31T17:00:00Z', '2026-12-31T17:00:00.000Z', '2027-01-01T16:59:59.999Z'],
])('WIB boundaries at %s are independent of host timezone', (now, start, end) => {
  expect(getWibDayBounds(new Date(now))).toEqual({ start: new Date(start), end: new Date(end) });
});
