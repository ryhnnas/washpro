async function setupStaffPage(page, options = {}) {
  const state = {
    role: 'STAFF', serviceStatus: 200, customerStatus: 200, settingsStatus: 200,
    statsStatus: 200, trendStatus: 200, topStatus: 200, refreshFails: false,
    posts: [], requests: [], menus: ['CASHIER', 'TRACKING', 'DASHBOARD'],
    requireCustomerName: true,
    postResponse: { id: 'tx-1', customerName: 'Budi Audit', customerPhone: '081234567890',
      totalPrice: 96000, coveredAmount: 80000, payableAmount: 16000, paymentMethod: 'CASH',
      estimatedCompletionAt: '2026-10-12T05:00:00Z',
      lineItems: [{ serviceId: 'svc-1', serviceName: 'Cuci Kering', qty: 12, unit: 'kg', price: 8000,
        lineTotal: 96000, coveredAmount: 80000, payableAmount: 16000 }], whatsapp: { ok: true } },
    ...options,
  };
  const service = { id: 'svc-1', name: 'Cuci Kering', price: 8000, unit: 'kg', type: 'KILOAN', estimateValue: 24, estimateUnit: 'HOUR' };
  const customer = { id: 'cust-1', name: 'Budi Audit', phone: '081234567890', membership: {
    isActive: true, templateId: 'pkg-1', balances: [{ serviceId: 'svc-1', remainingQty: 10 }] } };
  await page.addInitScript(() => { window.auditOpens = []; window.open = url => { window.auditOpens.push(url); return null; }; });
  await page.route('**/api/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, '');
    state.requests.push({ path, method: req.method(), query: Object.fromEntries(url.searchParams) });
    let status = 200, data;
    if (path === '/auth/csrf-token') data = { csrfToken: 'audit' };
    else if (path === '/auth/me') data = { user: { id: 'staff-1', name: 'Staf Audit', role: state.role, isEmailVerified: true, mustChangePassword: false } };
    else if (path === '/settings/public' || path === '/settings') {
      status = state.settingsStatus;
      data = { businessName: 'Laundry Audit', requireCustomerName: state.requireCustomerName,
        requireCustomerPhone: true, requireCustomerAddress: false, staffAllowedMenus: JSON.stringify(state.menus),
        membershipPackages: [{ id: 'pkg-1', items: [{ serviceId: 'svc-1', deductionRate: 1 }] }] };
    } else if (path === '/subscriptions/status') data = { showWarningBanner: false, subscriptionStatus: 'ACTIVE' };
    else if (path === '/services') { status = state.serviceStatus; data = [service]; }
    else if (path === '/customers') {
      status = state.refreshFails && state.posts.length ? 500 : state.customerStatus;
      data = { data: [customer], pagination: { total: 1 } };
    } else if (path === '/transactions' && req.method() === 'POST') {
      state.posts.push(req.postDataJSON()); status = state.postStatus || 201; data = state.postResponse;
    } else if (path === '/dashboard/stats') {
      status = state.statsStatus;
      data = { totalTransactions: 1, totalRevenue: 8000, paymentStats: [], statusStats: [], todayOrders: [] };
    } else if (path === '/dashboard/revenue-trend') { status = state.trendStatus; data = { data: [] }; }
    else if (path === '/dashboard/top-services') { status = state.topStatus; data = { data: [] }; }
    else return route.fulfill({ status: 404, json: { message: `Unmocked endpoint: ${path}` } });
    const loadMessages = {
      '/services': 'Gagal memuat layanan', '/customers': 'Gagal memuat pelanggan',
      '/settings/public': 'Gagal memuat pengaturan', '/settings': 'Gagal memuat pengaturan',
      '/dashboard/stats': 'Gagal memuat statistik dashboard',
      '/dashboard/revenue-trend': 'Gagal memuat tren pendapatan',
      '/dashboard/top-services': 'Gagal memuat layanan terlaris',
    };
    if (status >= 400) data = state.postStatus === status && path === '/transactions' ? state.postResponse
      : { message: status === 403 ? 'Anda tidak memiliki izin untuk aksi ini' : loadMessages[path] || 'Endpoint unavailable',
          code: status === 403 ? 'STAFF_PERMISSION_DENIED' : 'AUDIT_FETCH_FAILURE' };
    return route.fulfill({ status, json: data });
  });
  return state;
}
module.exports = { setupStaffPage };
