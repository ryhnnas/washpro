export const BUSINESS_TZ_OFFSET = 420;
const DAY_MS = 86400000;
const SHIFT = BUSINESS_TZ_OFFSET * 60000;
const wibStart = date => {
  const local = new Date(date.getTime() + SHIFT);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - SHIFT;
};
const parseDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  if (new Date(timestamp).toISOString().slice(0, 10) !== value) return NaN;
  return timestamp - SHIFT;
};
export function validateCustomDate(customDate = {}) {
  if (!customDate.start || !customDate.end) return 'Lengkapi tanggal awal dan akhir.';
  const start = parseDate(customDate.start), end = parseDate(customDate.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Tanggal tidak valid.';
  return start > end ? 'Tanggal awal harus sebelum atau sama dengan tanggal akhir.' : '';
}
export function getDateRange(filter, customDate = {}, now = new Date()) {
  let start = wibStart(now), end = start + DAY_MS - 1;
  if (filter === 'kemarin') { start -= DAY_MS; end -= DAY_MS; }
  else if (filter === '7_hari') start -= 6 * DAY_MS;
  else if (filter === 'bulan_ini') {
    const local = new Date(now.getTime() + SHIFT);
    start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - SHIFT;
  } else if (filter === 'kustom') {
    const error = validateCustomDate(customDate);
    if (error) throw new RangeError(error);
    start = parseDate(customDate.start); end = parseDate(customDate.end) + DAY_MS - 1;
  }
  return { startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString() };
}
export function getTrendRange({ startDate, endDate }) {
  const minimum = wibStart(new Date(endDate)) - 6 * DAY_MS;
  return { startDate: new Date(Math.min(Date.parse(startDate), minimum)).toISOString(), endDate };
}

export function formatWibDate(value) {
  return new Date(value).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
}
export function formatWibDateKey(value) {
  return new Date(new Date(value).getTime() + SHIFT).toISOString().slice(0, 10);
}
