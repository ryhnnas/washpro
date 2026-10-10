const demoStats = {
  totalBusinesses: 128,
  statusCounts: { ACTIVE: 83, TRIAL: 26, PENDING_PAYMENT: 0, EXPIRED: 12, SUSPENDED: 7 },
  pendingPayments: 9, oldestPendingPaymentAt: '2026-10-08T03:00:00Z',
  revenue: { thisMonth: 8750000, previousMonth: 7200000, trend: [
    { month: '2026-05', revenue: 3800000, count: 38 },
    { month: '2026-06', revenue: 4600000, count: 46 },
    { month: '2026-07', revenue: 4100000, count: 41 },
    { month: '2026-08', revenue: 6100000, count: 61 },
    { month: '2026-09', revenue: 7200000, count: 72 },
    { month: '2026-10', revenue: 8750000, count: 81 },
  ] },
  growth: { newThisMonth: 17, newPreviousMonth: 13 },
  conversion: { rate: 64, converted: 16, total: 25, cohortDays: 30 },
  expiringSoon: { days: 7, total: 3, items: [
    { id: 'b1', name: 'Bersih Laundry', status: 'ACTIVE', endsAt: '2026-10-13T16:59:59Z' },
    { id: 'b2', name: 'Ruang Cuci Bandung', status: 'TRIAL', endsAt: '2026-10-15T16:59:59Z' },
    { id: 'b3', name: 'Nusa Laundry & Dry Clean', status: 'ACTIVE', endsAt: '2026-10-17T16:59:59Z' },
  ] },
  inactive: { days: 14, total: 2, items: [{ id: 'b4', name: 'Kiloan Sudirman' }, { id: 'b5', name: 'Senja Laundry' }] },
  platform: { whatsappSessions: { connected: 74, disconnected: 7, error: 2 }, queue: { pending: 12, failed: 3 } },
  planBreakdown: [{ name: 'Pro Bulanan', count: 52, revenue: 5200000 }, { name: 'Starter', count: 23, revenue: 1150000 }, { name: 'Pro Tahunan', count: 6, revenue: 2400000 }],
};
async function setupSuperadminPage(page, options = {}) {
  const state = { stats: structuredClone(demoStats), statsStatus: 200, statsRequests: 0, paymentStatuses: [], ...options };
  await page.clock.setFixedTime(new Date('2026-10-12T04:00:00Z'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user: null } });
    if (path === '/api/superadmin/me') return route.fulfill({ json: { admin: { name: 'Admin WashPro', email: 'admin@washpro.local' } } });
    if (path === '/api/superadmin/stats') {
      state.statsRequests++;
      return route.fulfill({ status: state.statsStatus, json: state.statsStatus === 200 ? state.stats : { message: 'Gagal memuat statistik platform.' } });
    }
    if (path === '/api/superadmin/businesses') return route.fulfill({ json: { businesses: [], total: 0 } });
    if (path === '/api/superadmin/payments') {
      state.paymentStatuses.push(new URL(route.request().url()).searchParams.get('status'));
      return route.fulfill({ json: { payments: [], total: 0 } });
    }
    if (path === '/api/superadmin/plans') return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: { message: 'Unmocked endpoint' } });
  });
  return state;
}
module.exports = { setupSuperadminPage, demoStats };
