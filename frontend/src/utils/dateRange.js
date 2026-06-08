export const getDateRange = (filter, customDate) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (filter === 'kemarin') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (filter === '7_hari') {
    start.setDate(start.getDate() - 7);
  } else if (filter === 'bulan_ini') {
    start.setDate(1);
  } else if (filter === 'kustom') {
    if (customDate.start) {
      const cs = new Date(customDate.start);
      cs.setHours(0, 0, 0, 0);
      start.setTime(cs.getTime());
    }
    if (customDate.end) {
      const ce = new Date(customDate.end);
      ce.setHours(23, 59, 59, 999);
      end.setTime(ce.getTime());
    }
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};
