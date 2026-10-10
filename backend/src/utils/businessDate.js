const getWibDayBounds = (now = new Date()) => {
  const offsetMs = 420 * 60000;
  const local = new Date(now.getTime() + offsetMs);
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs);
  return { start, end: new Date(start.getTime() + 86400000 - 1) };
};
module.exports = { getWibDayBounds };
