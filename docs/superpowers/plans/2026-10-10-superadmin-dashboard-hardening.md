# Super Admin Dashboard Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every bug and information gap found in the SaaS owner (super admin) dashboard: broken delete flow, free-access loophole on reactivation, hidden records beyond page 1, swallowed errors, stale cache on delete, mislabeled audit field, and missing SaaS business metrics.

**Architecture:** Backend keeps thin controllers; new business rules live in two small services (`businessLifecycleService` for reactivation rules, `superAdminStatsService` for platform metrics). One additive DB migration records who rejected a payment. Frontend gets pagination/search/filter plumbing, explicit error states, a typed-name delete confirmation, a rejection-reason input, and a redesigned `DashboardTab`.

**Tech Stack:** Node/Express, Prisma 6 + MySQL, Jest (`NODE_ENV=test jest --runInBand`), React 19 + Vite 8 + Tailwind v4, lucide-react. No new dependencies.

**Spec:** This document, section "Spec" below (derived from the review of `superAdminController.js`, `superAdminRoutes.js`, `SuperAdminDashboard.jsx`, `tabs/*`, `components/*`).

## Global Constraints

- UI copy is Indonesian; keep the existing dark slate/indigo super admin look (`bg-white/5 border border-white/10 rounded-2xl`).
- Database changes must be **additive only** (`ALTER TABLE ... ADD COLUMN`); no column/table drops, no data deletion. Migration is verified on a throwaway MySQL 8 before shipping.
- No new npm dependencies.
- Business timezone for month/day bucketing is WIB, UTC+7 (`420` minutes), matching the tenant dashboard (`backend/src/controllers/dashboardController.js`).
- Controllers use `sendError(res, err, 500)` from `backend/src/utils/errorResponse.js` for unexpected errors; validation failures return `res.status(400).json({ message })`.
- Backend tests run with `cd backend && npm test`; prisma is mocked with `jest.mock('../../src/config/prisma', ...)` as in `backend/tests/unit/staffController.test.js`.
- Frontend has no unit-test runner; its gate is `cd frontend && npx eslint <files> && npm run build`.
- Commit messages end with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Commit only after the user approves committing; the working tree already contains unrelated uncommitted changes, so stage **only** the files listed in each task.

## Spec

| # | Finding | Required behavior |
|---|---------|-------------------|
| F1 | Delete toko always fails: frontend sends no `confirmName`, backend requires it. Modal/toast say "permanen" but backend soft-deletes. | Modal requires typing the exact store name; request carries `{ confirmName }`; copy says "nonaktifkan"/"dapat dipulihkan tim teknis". |
| F2 | `ACTIVATE` always sets `ACTIVE`; a suspended TRIAL store becomes ACTIVE with `subscriptionEndAt = null` and never expires. | `ACTIVATE` resolves status: paid subscription still running → `ACTIVE`; never paid and trial still running → `TRIAL`; otherwise `EXPIRED`. Deleted store → 400. |
| F3 | Lists show only first 20 rows; no search/filter/pagination UI. | Backend clamps `page`/`limit`, validates `status`, supports `search`; frontend has search, status filter, pagination for businesses and pagination for payments. |
| F4 | `totalBusinesses` counts soft-deleted stores. | All platform counts exclude `deletedAt != null`. |
| F5 | Fetch errors are swallowed (`catch {}`), screen stays empty/"Memuat…". | Each tab shows an error banner with retry. |
| F6 | `deleteBusiness` does not call `invalidateSubscriptionCache`. | It does. |
| F7 | Reject writes the rejecting admin into `approvedById`; reject reason is hard-coded "Bukti tidak valid". | New `rejectedById`/`rejectedAt` columns; reject never touches `approvedById`; ProofModal has a reason textarea (min 5 chars). |
| F8 | Missing SaaS metrics. | Stats add: status counts incl. Expired/Suspended (lapsed-but-unflipped stores counted as Expired), MRR this month vs last month + 6-month trend, oldest pending payment age, new stores vs last month, trial→paid conversion (90-day cohort), stores expiring ≤7 days, active stores with no transactions ≥14 days, payments per plan this month, tenant WhatsApp session health and failed/pending queue. |

---

## File Structure

**Backend**
- Create `backend/src/services/businessLifecycleService.js` — pure rule: which status a reactivated store gets.
- Create `backend/src/services/superAdminStatsService.js` — `buildPlatformStats(prisma, now)`; all platform metrics.
- Modify `backend/src/controllers/superAdminController.js` — toggle/delete/reject fixes, pagination helper, stats wiring.
- Modify `backend/prisma/schema.prisma` — `rejectedAt`, `rejectedById` on `SubscriptionPayment`.
- Create `backend/prisma/migrations/20260710100000_add_payment_rejection_audit/migration.sql`.
- Tests: `backend/tests/unit/businessLifecycleService.test.js`, `backend/tests/unit/superAdminController.test.js`, `backend/tests/unit/superAdminStatsService.test.js`.

**Frontend** (`frontend/src/pages/superadmin/`)
- Create `components/Pagination.jsx`.
- Modify `services/superAdminService.js`.
- Modify `components/ConfirmDeleteModal.jsx`, `components/ProofModal.jsx`.
- Modify `tabs/BusinessesTab.jsx`, `tabs/PaymentsTab.jsx`, `tabs/DashboardTab.jsx`.
- Modify `SuperAdminDashboard.jsx`.

---

### Task 1: Reactivation status rule

**Files:**
- Create: `backend/src/services/businessLifecycleService.js`
- Test: `backend/tests/unit/businessLifecycleService.test.js`

**Interfaces:**
- Produces: `resolveReactivationStatus(business, now = new Date()) → { ok: true, status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' } | { ok: false, code: 'BUSINESS_DELETED' }`. `business` needs `deletedAt`, `subscriptionEndAt`, `trialEndAt` (Date | null).

- [ ] **Step 1: Write the failing test**

```js
// backend/tests/unit/businessLifecycleService.test.js
const { resolveReactivationStatus } = require('../../src/services/businessLifecycleService');

const NOW = new Date('2026-10-15T00:00:00Z');
const day = (n) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe('resolveReactivationStatus', () => {
  it('refuses deleted businesses', () => {
    const result = resolveReactivationStatus(
      { deletedAt: day(-1), subscriptionEndAt: day(10), trialEndAt: null }, NOW,
    );
    expect(result).toEqual({ ok: false, code: 'BUSINESS_DELETED' });
  });

  it('returns ACTIVE only while a paid subscription is still running', () => {
    const result = resolveReactivationStatus(
      { deletedAt: null, subscriptionEndAt: day(5), trialEndAt: day(-20) }, NOW,
    );
    expect(result).toEqual({ ok: true, status: 'ACTIVE' });
  });

  it('returns TRIAL when the store never paid and the trial is still running', () => {
    const result = resolveReactivationStatus(
      { deletedAt: null, subscriptionEndAt: null, trialEndAt: day(3) }, NOW,
    );
    expect(result).toEqual({ ok: true, status: 'TRIAL' });
  });

  it('returns EXPIRED when the store never paid and the trial is over', () => {
    const result = resolveReactivationStatus(
      { deletedAt: null, subscriptionEndAt: null, trialEndAt: day(-1) }, NOW,
    );
    expect(result).toEqual({ ok: true, status: 'EXPIRED' });
  });

  it('returns EXPIRED when the paid subscription already lapsed', () => {
    const result = resolveReactivationStatus(
      { deletedAt: null, subscriptionEndAt: day(-2), trialEndAt: day(-40) }, NOW,
    );
    expect(result).toEqual({ ok: true, status: 'EXPIRED' });
  });

  it('never returns ACTIVE without an end date', () => {
    const result = resolveReactivationStatus(
      { deletedAt: null, subscriptionEndAt: null, trialEndAt: null }, NOW,
    );
    expect(result).toEqual({ ok: true, status: 'EXPIRED' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && NODE_ENV=test npx jest tests/unit/businessLifecycleService.test.js`
Expected: FAIL — `Cannot find module '../../src/services/businessLifecycleService'`.

- [ ] **Step 3: Write minimal implementation**

```js
// backend/src/services/businessLifecycleService.js
/**
 * Status yang berlaku saat super admin mengaktifkan kembali toko.
 * Tidak pernah mengembalikan ACTIVE tanpa masa aktif berbayar yang masih berjalan,
 * karena ACTIVE dengan subscriptionEndAt = null tidak pernah kedaluwarsa.
 */
const resolveReactivationStatus = (business, now = new Date()) => {
  if (business.deletedAt) return { ok: false, code: 'BUSINESS_DELETED' };

  if (business.subscriptionEndAt && business.subscriptionEndAt > now) {
    return { ok: true, status: 'ACTIVE' };
  }
  if (!business.subscriptionEndAt && business.trialEndAt && business.trialEndAt > now) {
    return { ok: true, status: 'TRIAL' };
  }
  return { ok: true, status: 'EXPIRED' };
};

module.exports = { resolveReactivationStatus };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && NODE_ENV=test npx jest tests/unit/businessLifecycleService.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/businessLifecycleService.js backend/tests/unit/businessLifecycleService.test.js
git commit -m "feat(superadmin): add reactivation status rule

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Payment rejection audit columns (migration)

**Files:**
- Modify: `backend/prisma/schema.prisma` (model `SubscriptionPayment`, after line 67 `rejectionReason`)
- Create: `backend/prisma/migrations/20260710100000_add_payment_rejection_audit/migration.sql`

**Interfaces:**
- Produces: Prisma fields `SubscriptionPayment.rejectedAt: DateTime?`, `SubscriptionPayment.rejectedById: String?` (DB `rejected_at`, `rejected_by_id`). Task 3 writes them.

- [ ] **Step 1: Edit the schema**

In `model SubscriptionPayment`, directly below the `rejectionReason` line add:

```prisma
  rejectedAt      DateTime?     @map("rejected_at")
  rejectedById    String?       @map("rejected_by_id")
```

- [ ] **Step 2: Write the migration (additive; moves mislabeled values, deletes nothing)**

```sql
-- backend/prisma/migrations/20260710100000_add_payment_rejection_audit/migration.sql
-- Record who rejected a payment separately from who approved it.
ALTER TABLE `SubscriptionPayment`
    ADD COLUMN `rejected_at` DATETIME(3) NULL,
    ADD COLUMN `rejected_by_id` VARCHAR(191) NULL;

-- Rejections previously stored the rejecting admin in approved_by_id. Move that value
-- to the new column so "approved by" is only ever set on APPROVED payments.
UPDATE `SubscriptionPayment`
SET `rejected_by_id` = `approved_by_id`,
    `rejected_at` = `updated_at`,
    `approved_by_id` = NULL
WHERE `status` = 'REJECTED' AND `approved_by_id` IS NOT NULL;
```

- [ ] **Step 3: Validate schema and regenerate client**

Run: `cd backend && DATABASE_URL="mysql://u:p@localhost:3306/x" npx prisma validate && DATABASE_URL="mysql://u:p@localhost:3306/x" npx prisma generate`
Expected: "The schema at prisma/schema.prisma is valid" and client generated.

- [ ] **Step 4: Verify the migration on a throwaway MySQL**

```bash
docker run -d --name washpro-migtest -e MYSQL_ROOT_PASSWORD=pw -e MYSQL_DATABASE=washpro -p 33999:3306 mysql:8.0
until docker exec washpro-migtest mysql -uroot -ppw -e "select 1" washpro >/dev/null 2>&1; do sleep 2; done
cd backend && DATABASE_URL="mysql://root:pw@127.0.0.1:33999/washpro" npx prisma migrate deploy
docker exec washpro-migtest mysql -uroot -ppw washpro -e "SHOW COLUMNS FROM SubscriptionPayment LIKE 'rejected%'"
docker rm -f washpro-migtest
```
Expected: "All migrations have been successfully applied", and `rejected_at`, `rejected_by_id` listed.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260710100000_add_payment_rejection_audit
git commit -m "feat(db): record payment rejector separately from approver

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Controller fixes — toggle, delete, reject

**Files:**
- Modify: `backend/src/controllers/superAdminController.js` (imports at top; `toggleBusiness` ~lines 118-166; `deleteBusiness` ~168-203; `rejectPayment` ~290-338)
- Test: `backend/tests/unit/superAdminController.test.js`

**Interfaces:**
- Consumes: `resolveReactivationStatus` (Task 1); `rejectedAt`/`rejectedById` (Task 2).
- Produces: `toggleBusiness` response `{ message, business }` where `message` for ACTIVATE is `Toko diaktifkan kembali dengan status <Aktif|Trial|Kadaluarsa>`; frontend shows it verbatim.

- [ ] **Step 1: Write the failing tests**

```js
// backend/tests/unit/superAdminController.test.js
const prisma = require('../../src/config/prisma');
const { invalidateSubscriptionCache } = require('../../src/middleware/checkSubscription');
const {
  toggleBusiness, deleteBusiness, rejectPayment,
} = require('../../src/controllers/superAdminController');

jest.mock('../../src/config/prisma', () => ({
  business: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  user: { findFirst: jest.fn() },
  subscriptionPayment: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
}));
jest.mock('../../src/services/whatsappService', () => ({ sendMessage: jest.fn().mockResolvedValue({ ok: true }) }));
jest.mock('../../src/services/emailService', () => ({ sendEmail: jest.fn().mockResolvedValue({ ok: true }) }));
jest.mock('../../src/middleware/checkSubscription', () => ({ invalidateSubscriptionCache: jest.fn() }));
jest.mock('../../src/middleware/csrf', () => ({ generateCsrfToken: jest.fn(), setCsrfCookie: jest.fn() }));

const makeRes = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() });
const DAY = 24 * 60 * 60 * 1000;
const baseBusiness = {
  id: 'biz-1', name: 'Laundry Jaya', phone: null, subscriptionStatus: 'SUSPENDED',
  deletedAt: null, subscriptionEndAt: null, trialEndAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  prisma.user.findFirst.mockResolvedValue(null);
  prisma.business.update.mockImplementation(async ({ data }) => ({ ...baseBusiness, ...data }));
});

describe('toggleBusiness', () => {
  const call = (action) => {
    const res = makeRes();
    return toggleBusiness({ params: { businessId: 'biz-1' }, body: { action } }, res).then(() => res);
  };

  it('reactivates a store with a running paid subscription as ACTIVE', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...baseBusiness, subscriptionEndAt: new Date(Date.now() + 5 * DAY) });
    const res = await call('ACTIVATE');
    expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({ data: { subscriptionStatus: 'ACTIVE' } }));
    expect(res.json.mock.calls[0][0].message).toContain('Aktif');
  });

  it('never grants ACTIVE to a store that never paid and whose trial is over', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...baseBusiness, trialEndAt: new Date(Date.now() - DAY) });
    const res = await call('ACTIVATE');
    expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({ data: { subscriptionStatus: 'EXPIRED' } }));
    expect(res.json.mock.calls[0][0].message).toContain('Kadaluarsa');
  });

  it('restores TRIAL while the trial is still running', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...baseBusiness, trialEndAt: new Date(Date.now() + 3 * DAY) });
    await call('ACTIVATE');
    expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({ data: { subscriptionStatus: 'TRIAL' } }));
  });

  it('rejects activating a deleted store', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...baseBusiness, deletedAt: new Date() });
    const res = await call('ACTIVATE');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it('suspends and invalidates the subscription cache', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...baseBusiness, subscriptionStatus: 'ACTIVE' });
    await call('SUSPEND');
    expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({ data: { subscriptionStatus: 'SUSPENDED' } }));
    expect(invalidateSubscriptionCache).toHaveBeenCalledWith('biz-1');
  });
});

describe('deleteBusiness', () => {
  it('soft deletes and invalidates the subscription cache when the name matches', async () => {
    prisma.business.findUnique.mockResolvedValue({ id: 'biz-1', name: 'Laundry Jaya', subscriptionStatus: 'ACTIVE' });
    prisma.business.update.mockResolvedValue({});
    const res = makeRes();
    await deleteBusiness({ params: { businessId: 'biz-1' }, body: { confirmName: ' Laundry Jaya ' } }, res);
    expect(prisma.business.update).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      data: { deletedAt: expect.any(Date), subscriptionStatus: 'SUSPENDED' },
    });
    expect(invalidateSubscriptionCache).toHaveBeenCalledWith('biz-1');
  });

  it('refuses when the typed name does not match', async () => {
    prisma.business.findUnique.mockResolvedValue({ id: 'biz-1', name: 'Laundry Jaya', subscriptionStatus: 'ACTIVE' });
    const res = makeRes();
    await deleteBusiness({ params: { businessId: 'biz-1' }, body: { confirmName: 'laundry' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.business.update).not.toHaveBeenCalled();
    expect(invalidateSubscriptionCache).not.toHaveBeenCalled();
  });
});

describe('rejectPayment', () => {
  it('records the rejector in rejectedById and leaves approvedById untouched', async () => {
    prisma.subscriptionPayment.findUnique.mockResolvedValue({
      id: 'pay-1', businessId: 'biz-1', amount: 50000, status: 'PENDING',
      business: { id: 'biz-1', name: 'Laundry Jaya', phone: null, subscriptionStatus: 'PENDING_PAYMENT' },
      plan: { name: 'Bulanan' },
    });
    prisma.subscriptionPayment.update.mockResolvedValue({ id: 'pay-1', status: 'REJECTED' });
    prisma.business.update.mockResolvedValue({});
    const res = makeRes();

    await rejectPayment(
      { params: { paymentId: 'pay-1' }, body: { reason: 'Nominal tidak sesuai' }, superAdmin: { id: 'sa-1' } },
      res,
    );

    const data = prisma.subscriptionPayment.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      status: 'REJECTED', rejectedById: 'sa-1', rejectedAt: expect.any(Date), rejectionReason: 'Nominal tidak sesuai',
    });
    expect(data).not.toHaveProperty('approvedById');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && NODE_ENV=test npx jest tests/unit/superAdminController.test.js`
Expected: FAIL — ACTIVATE tests expect `EXPIRED`/`TRIAL`/400 but get `ACTIVE`; delete test fails on the missing cache invalidation; reject test fails on `rejectedById`.

- [ ] **Step 3: Implement the controller changes**

3a. Add near the other requires at the top of `superAdminController.js`:

```js
const { resolveReactivationStatus } = require('../services/businessLifecycleService');

const REACTIVATION_LABEL = { ACTIVE: 'Aktif', TRIAL: 'Trial', EXPIRED: 'Kadaluarsa' };
```

3b. In `toggleBusiness`, replace

```js
    const newStatus = action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE';
    const updated = await prisma.business.update({
```
with
```js
    let newStatus = 'SUSPENDED';
    if (action !== 'SUSPEND') {
      const outcome = resolveReactivationStatus(business);
      if (!outcome.ok) {
        return res.status(400).json({ message: 'Toko sudah dihapus dan tidak dapat diaktifkan kembali.' });
      }
      newStatus = outcome.status;
    }
    const updated = await prisma.business.update({
```
and replace the final response

```js
    res.json({ message: `Toko berhasil ${action === 'SUSPEND' ? 'ditangguhkan' : 'diaktifkan'}`, business: updated });
```
with
```js
    const message = action === 'SUSPEND'
      ? 'Toko berhasil ditangguhkan'
      : `Toko diaktifkan kembali dengan status ${REACTIVATION_LABEL[newStatus]}`;
    res.json({ message, business: updated });
```

3c. In `deleteBusiness`, immediately after the `await prisma.business.update({ ... });` call add:

```js
    invalidateSubscriptionCache(businessId);
```

3d. In `rejectPayment`, replace

```js
        approvedById: superAdminId,
        rejectionReason: reason || 'Bukti pembayaran tidak valid.',
```
with
```js
        rejectedById: superAdminId,
        rejectedAt: new Date(),
        rejectionReason: reason || 'Bukti pembayaran tidak valid.',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && NODE_ENV=test npx jest tests/unit/superAdminController.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/superAdminController.js backend/tests/unit/superAdminController.test.js
git commit -m "fix(superadmin): safe reactivation, cache invalidation on delete, rejector audit

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: List endpoints — clamped pagination, validated filters, search

**Files:**
- Modify: `backend/src/controllers/superAdminController.js` (`getBusinesses`, `getPayments`)
- Test: `backend/tests/unit/superAdminController.test.js` (append a `describe`)

**Interfaces:**
- Produces: `GET /superadmin/businesses?page&limit&status&search` and `GET /superadmin/payments?page&limit&status&search` both return `{ <businesses|payments>, total, page, limit, totalPages }`. `limit` is clamped to 1..100 (default 20); invalid `status` → 400.

- [ ] **Step 1: Write the failing tests** (append to `superAdminController.test.js`; also add `getBusinesses, getPayments` to the destructured require at the top)

```js
describe('list endpoints', () => {
  beforeEach(() => {
    prisma.business.findMany.mockResolvedValue([]);
    prisma.business.count.mockResolvedValue(45);
    prisma.subscriptionPayment.findMany.mockResolvedValue([]);
    prisma.subscriptionPayment.count.mockResolvedValue(3);
  });

  it('clamps limit, computes skip and totalPages for businesses', async () => {
    const res = makeRes();
    await getBusinesses({ query: { page: '3', limit: '500', search: ' jaya ', status: 'ACTIVE' } }, res);
    const args = prisma.business.findMany.mock.calls[0][0];
    expect(args.take).toBe(100);
    expect(args.skip).toBe(200);
    expect(args.where).toEqual({ deletedAt: null, subscriptionStatus: 'ACTIVE', name: { contains: 'jaya' } });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 45, page: 3, limit: 100, totalPages: 1 }));
  });

  it('falls back to page 1 / limit 20 on garbage input', async () => {
    const res = makeRes();
    await getBusinesses({ query: { page: '-4', limit: 'abc' } }, res);
    const args = prisma.business.findMany.mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
  });

  it('rejects an unknown business status', async () => {
    const res = makeRes();
    await getBusinesses({ query: { status: 'DROP TABLE' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.business.findMany).not.toHaveBeenCalled();
  });

  it('filters payments by status and business name', async () => {
    const res = makeRes();
    await getPayments({ query: { status: 'PENDING', search: 'laundry', page: '2', limit: '10' } }, res);
    const args = prisma.subscriptionPayment.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ status: 'PENDING', business: { name: { contains: 'laundry' } } });
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 3, page: 2, limit: 10, totalPages: 1 }));
  });

  it('rejects an unknown payment status', async () => {
    const res = makeRes();
    await getPayments({ query: { status: 'NOPE' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && NODE_ENV=test npx jest tests/unit/superAdminController.test.js -t "list endpoints"`
Expected: FAIL (no clamping, no `totalPages`, no 400).

- [ ] **Step 3: Implement**

Add helpers near the top of `superAdminController.js`:

```js
const BUSINESS_STATUSES = ['TRIAL', 'ACTIVE', 'PENDING_PAYMENT', 'EXPIRED', 'SUSPENDED'];
const PAYMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const withTotalPages = (total, limit) => Math.max(1, Math.ceil(total / limit));
```

Replace the body of `getBusinesses` with:

```js
const getBusinesses = async (req, res) => {
  try {
    const { status, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    if (status && !BUSINESS_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Status toko tidak valid' });
    }

    const where = { deletedAt: null };
    if (status) where.subscriptionStatus = status;
    if (search && String(search).trim()) where.name = { contains: String(search).trim() };

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: { where: { role: 'OWNER' }, select: { name: true, email: true } },
          _count: { select: { transactions: true, customers: true } },
        },
      }),
      prisma.business.count({ where }),
    ]);

    res.json({ businesses, total, page, limit, totalPages: withTotalPages(total, limit) });
  } catch (err) {
    sendError(res, err, 500);
  }
};
```

Replace the body of `getPayments` with:

```js
const getPayments = async (req, res) => {
  try {
    const { status, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    if (status && !PAYMENT_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Status pembayaran tidak valid' });
    }

    const where = {};
    if (status) where.status = status;
    if (search && String(search).trim()) where.business = { name: { contains: String(search).trim() } };

    const [payments, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { name: true, phone: true } },
          plan: { select: { name: true, durationDays: true } },
          uploadedBy: { select: { name: true, email: true } },
        },
      }),
      prisma.subscriptionPayment.count({ where }),
    ]);

    res.json({ payments, total, page, limit, totalPages: withTotalPages(total, limit) });
  } catch (err) {
    sendError(res, err, 500);
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && NODE_ENV=test npx jest tests/unit/superAdminController.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/superAdminController.js backend/tests/unit/superAdminController.test.js
git commit -m "feat(superadmin): clamp pagination, validate filters, add search

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Platform stats service

**Files:**
- Create: `backend/src/services/superAdminStatsService.js`
- Test: `backend/tests/unit/superAdminStatsService.test.js`

**Interfaces:**
- Produces: `buildPlatformStats(prisma, now = new Date())` resolving to:

```
{
  totalBusinesses, activeBusinesses, trialBusinesses, pendingPayments, monthlyRevenue,  // legacy keys kept
  statusCounts: { TRIAL, ACTIVE, PENDING_PAYMENT, EXPIRED, SUSPENDED },   // effective counts
  oldestPendingPaymentAt: Date | null,
  revenue: { thisMonth, previousMonth, trend: [{ month: 'YYYY-MM', revenue, count }] },  // 6 entries, oldest first
  growth: { newThisMonth, newPreviousMonth },
  conversion: { cohortDays, total, converted, rate },   // rate is a percent with 1 decimal
  expiringSoon: { days, total, items: [{ id, name, status: 'ACTIVE'|'TRIAL', endsAt }] },   // items ≤ 10, soonest first
  inactive: { days, total, items: [{ id, name }] },   // items ≤ 10
  planBreakdown: [{ name, count, revenue }],           // approved payments this month, revenue desc
  platform: { whatsappSessions: { connected, disconnected, error }, queue: { pending, failed } },
}
```

- [ ] **Step 1: Write the failing test**

```js
// backend/tests/unit/superAdminStatsService.test.js
const { buildPlatformStats } = require('../../src/services/superAdminStatsService');

const NOW = new Date('2026-10-15T05:00:00Z');
const MONTH_START = new Date('2026-09-30T17:00:00.000Z'); // 1 Okt 00:00 WIB
const TREND_START = new Date('2026-04-30T17:00:00.000Z'); // 1 Mei 00:00 WIB

const makePrisma = () => ({
  business: {
    groupBy: jest.fn().mockResolvedValue([
      { subscriptionStatus: 'TRIAL', _count: { _all: 4 } },
      { subscriptionStatus: 'ACTIVE', _count: { _all: 10 } },
      { subscriptionStatus: 'EXPIRED', _count: { _all: 2 } },
      { subscriptionStatus: 'SUSPENDED', _count: { _all: 1 } },
    ]),
    count: jest.fn(async ({ where }) => {
      if (where.transactions) return 4;                                              // inactive
      if (where.subscriptionPayments) return 2;                                      // cohort converted
      if (where.subscriptionStatus === 'ACTIVE' && where.subscriptionEndAt?.lt) return 3; // lapsed active
      if (where.subscriptionStatus === 'TRIAL' && where.trialEndAt?.lt) return 1;         // lapsed trial
      if (where.subscriptionStatus === 'ACTIVE' && where.subscriptionEndAt?.gte) return 2; // expiring active
      if (where.subscriptionStatus === 'TRIAL' && where.trialEndAt?.gte) return 1;         // expiring trial
      if (where.createdAt?.lt && where.createdAt?.gte) return 2;                     // new previous month
      if (where.createdAt?.gte?.getTime() === MONTH_START.getTime()) return 3;       // new this month
      if (where.createdAt?.gte) return 8;                                            // cohort total
      throw new Error(`unexpected business.count where: ${JSON.stringify(where)}`);
    }),
    findMany: jest.fn(async ({ where }) => {
      if (where.transactions) return [{ id: 'b3', name: 'Toko C' }];
      if (where.subscriptionStatus === 'ACTIVE') {
        return [{ id: 'b1', name: 'Toko A', subscriptionEndAt: new Date('2026-10-17T00:00:00Z') }];
      }
      if (where.subscriptionStatus === 'TRIAL') {
        return [{ id: 'b2', name: 'Toko B', trialEndAt: new Date('2026-10-16T00:00:00Z') }];
      }
      throw new Error(`unexpected business.findMany where: ${JSON.stringify(where)}`);
    }),
  },
  subscriptionPayment: {
    count: jest.fn().mockResolvedValue(5),
    findFirst: jest.fn().mockResolvedValue({ createdAt: new Date('2026-10-10T00:00:00Z') }),
    findMany: jest.fn().mockResolvedValue([
      { amount: 100000, approvedAt: new Date('2026-10-02T03:00:00Z'), plan: { name: 'Bulanan' } },
      { amount: 50000, approvedAt: new Date('2026-09-30T18:00:00Z'), plan: { name: 'Bulanan' } }, // 1 Okt 01:00 WIB
      { amount: 200000, approvedAt: new Date('2026-09-15T03:00:00Z'), plan: { name: 'Tahunan' } },
      { amount: 30000, approvedAt: new Date('2026-05-10T03:00:00Z'), plan: { name: 'Bulanan' } },
    ]),
  },
  whatsAppSession: {
    groupBy: jest.fn().mockResolvedValue([
      { status: 'connected', _count: { _all: 5 } },
      { status: 'error', _count: { _all: 1 } },
    ]),
  },
  whatsAppQueue: {
    groupBy: jest.fn().mockResolvedValue([
      { status: 'PENDING', _count: { _all: 2 } },
      { status: 'FAILED', _count: { _all: 3 } },
    ]),
  },
});

describe('buildPlatformStats', () => {
  it('counts stores excluding soft-deleted and moves lapsed stores to EXPIRED', async () => {
    const prisma = makePrisma();
    const stats = await buildPlatformStats(prisma, NOW);

    expect(prisma.business.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    );
    expect(stats.totalBusinesses).toBe(17);
    expect(stats.statusCounts).toEqual({ TRIAL: 3, ACTIVE: 7, PENDING_PAYMENT: 0, EXPIRED: 6, SUSPENDED: 1 });
    expect(stats.activeBusinesses).toBe(7);
    expect(stats.trialBusinesses).toBe(3);
  });

  it('computes revenue per WIB month, a 6-month trend and plan breakdown', async () => {
    const prisma = makePrisma();
    const stats = await buildPlatformStats(prisma, NOW);

    expect(prisma.subscriptionPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'APPROVED', approvedAt: { gte: TREND_START } } }),
    );
    expect(stats.revenue.thisMonth).toBe(150000);
    expect(stats.monthlyRevenue).toBe(150000);
    expect(stats.revenue.previousMonth).toBe(200000);
    expect(stats.revenue.trend).toEqual([
      { month: '2026-05', revenue: 30000, count: 1 },
      { month: '2026-06', revenue: 0, count: 0 },
      { month: '2026-07', revenue: 0, count: 0 },
      { month: '2026-08', revenue: 0, count: 0 },
      { month: '2026-09', revenue: 200000, count: 1 },
      { month: '2026-10', revenue: 150000, count: 2 },
    ]);
    expect(stats.planBreakdown).toEqual([{ name: 'Bulanan', count: 2, revenue: 150000 }]);
  });

  it('reports pending queue, growth, conversion, expiring and inactive stores', async () => {
    const prisma = makePrisma();
    const stats = await buildPlatformStats(prisma, NOW);

    expect(stats.pendingPayments).toBe(5);
    expect(stats.oldestPendingPaymentAt).toEqual(new Date('2026-10-10T00:00:00Z'));
    expect(stats.growth).toEqual({ newThisMonth: 3, newPreviousMonth: 2 });
    expect(stats.conversion).toEqual({ cohortDays: 90, total: 8, converted: 2, rate: 25 });
    expect(stats.expiringSoon.total).toBe(3);
    expect(stats.expiringSoon.days).toBe(7);
    expect(stats.expiringSoon.items.map((i) => [i.id, i.status])).toEqual([['b2', 'TRIAL'], ['b1', 'ACTIVE']]);
    expect(stats.inactive).toEqual({ days: 14, total: 4, items: [{ id: 'b3', name: 'Toko C' }] });
  });

  it('reports tenant WhatsApp health across the platform', async () => {
    const stats = await buildPlatformStats(makePrisma(), NOW);
    expect(stats.platform).toEqual({
      whatsappSessions: { connected: 5, disconnected: 0, error: 1 },
      queue: { pending: 2, failed: 3 },
    });
  });

  it('returns a zero conversion rate for an empty cohort', async () => {
    const prisma = makePrisma();
    const original = prisma.business.count.getMockImplementation();
    prisma.business.count.mockImplementation(async (args) => {
      if (args.where.subscriptionPayments) return 0;
      if (args.where.createdAt?.gte && !args.where.createdAt.lt
        && args.where.createdAt.gte.getTime() !== MONTH_START.getTime()) return 0;
      return original(args);
    });
    const stats = await buildPlatformStats(prisma, NOW);
    expect(stats.conversion.rate).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && NODE_ENV=test npx jest tests/unit/superAdminStatsService.test.js`
Expected: FAIL — `Cannot find module '../../src/services/superAdminStatsService'`.

- [ ] **Step 3: Write the implementation**

```js
// backend/src/services/superAdminStatsService.js
const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MIN = 420;
const BUSINESS_STATUSES = ['TRIAL', 'ACTIVE', 'PENDING_PAYMENT', 'EXPIRED', 'SUSPENDED'];
const EXPIRING_DAYS = 7;
const INACTIVE_DAYS = 14;
const COHORT_DAYS = 90;
const REVENUE_MONTHS = 6;
const LIST_LIMIT = 10;

const shiftMs = WIB_OFFSET_MIN * 60000;

/** 'YYYY-MM' untuk instan `date` menurut kalender WIB. */
const monthKey = (date) => new Date(date.getTime() + shiftMs).toISOString().slice(0, 7);

/** Instan 00:00 WIB tanggal 1 bulan (bulan `date` + offsetMonths). */
const startOfMonthWib = (date, offsetMonths = 0) => {
  const local = new Date(date.getTime() + shiftMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + offsetMonths, 1) - shiftMs);
};

const buildPlatformStats = async (prisma, now = new Date()) => {
  const monthStart = startOfMonthWib(now);
  const prevMonthStart = startOfMonthWib(now, -1);
  const trendStart = startOfMonthWib(now, -(REVENUE_MONTHS - 1));
  const expiringUntil = new Date(now.getTime() + EXPIRING_DAYS * DAY_MS);
  const inactiveSince = new Date(now.getTime() - INACTIVE_DAYS * DAY_MS);
  const cohortStart = new Date(now.getTime() - COHORT_DAYS * DAY_MS);

  const live = { deletedAt: null };
  const expiringWhere = (status, field) => ({
    ...live, subscriptionStatus: status, [field]: { gte: now, lte: expiringUntil },
  });
  const inactiveWhere = {
    ...live,
    subscriptionStatus: 'ACTIVE',
    createdAt: { lt: inactiveSince },
    transactions: { none: { startDate: { gte: inactiveSince } } },
  };
  const cohortWhere = { ...live, createdAt: { gte: cohortStart } };

  const [
    statusGroups, lapsedActive, lapsedTrial,
    pendingPayments, oldestPending, approvedPayments,
    newThisMonth, newPreviousMonth,
    expiringActiveCount, expiringTrialCount, expiringActiveList, expiringTrialList,
    inactiveCount, inactiveList,
    cohortTotal, cohortConverted,
    waSessionGroups, waQueueGroups,
  ] = await Promise.all([
    prisma.business.groupBy({ by: ['subscriptionStatus'], _count: { _all: true }, where: live }),
    prisma.business.count({ where: { ...live, subscriptionStatus: 'ACTIVE', subscriptionEndAt: { lt: now } } }),
    prisma.business.count({ where: { ...live, subscriptionStatus: 'TRIAL', trialEndAt: { lt: now } } }),
    prisma.subscriptionPayment.count({ where: { status: 'PENDING' } }),
    prisma.subscriptionPayment.findFirst({
      where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true },
    }),
    prisma.subscriptionPayment.findMany({
      where: { status: 'APPROVED', approvedAt: { gte: trendStart } },
      select: { amount: true, approvedAt: true, plan: { select: { name: true } } },
    }),
    prisma.business.count({ where: { ...live, createdAt: { gte: monthStart } } }),
    prisma.business.count({ where: { ...live, createdAt: { gte: prevMonthStart, lt: monthStart } } }),
    prisma.business.count({ where: expiringWhere('ACTIVE', 'subscriptionEndAt') }),
    prisma.business.count({ where: expiringWhere('TRIAL', 'trialEndAt') }),
    prisma.business.findMany({
      where: expiringWhere('ACTIVE', 'subscriptionEndAt'),
      select: { id: true, name: true, subscriptionEndAt: true },
      orderBy: { subscriptionEndAt: 'asc' },
      take: LIST_LIMIT,
    }),
    prisma.business.findMany({
      where: expiringWhere('TRIAL', 'trialEndAt'),
      select: { id: true, name: true, trialEndAt: true },
      orderBy: { trialEndAt: 'asc' },
      take: LIST_LIMIT,
    }),
    prisma.business.count({ where: inactiveWhere }),
    prisma.business.findMany({
      where: inactiveWhere, select: { id: true, name: true }, orderBy: { createdAt: 'asc' }, take: LIST_LIMIT,
    }),
    prisma.business.count({ where: cohortWhere }),
    prisma.business.count({ where: { ...cohortWhere, subscriptionPayments: { some: { status: 'APPROVED' } } } }),
    prisma.whatsAppSession.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.whatsAppQueue.groupBy({
      by: ['status'], _count: { _all: true }, where: { status: { in: ['PENDING', 'FAILED'] } },
    }),
  ]);

  // Status efektif: toko ACTIVE/TRIAL yang masa aktifnya lewat tapi belum di-flip ke EXPIRED
  // (flip terjadi lazy saat toko itu membuat request) dihitung sebagai Kadaluarsa.
  const statusCounts = Object.fromEntries(BUSINESS_STATUSES.map((s) => [s, 0]));
  let totalBusinesses = 0;
  for (const group of statusGroups) {
    statusCounts[group.subscriptionStatus] = group._count._all;
    totalBusinesses += group._count._all;
  }
  statusCounts.ACTIVE -= lapsedActive;
  statusCounts.TRIAL -= lapsedTrial;
  statusCounts.EXPIRED += lapsedActive + lapsedTrial;

  const currentKey = monthKey(monthStart);
  const previousKey = monthKey(prevMonthStart);
  const trend = new Map();
  for (let i = REVENUE_MONTHS - 1; i >= 0; i -= 1) {
    const key = monthKey(startOfMonthWib(now, -i));
    trend.set(key, { month: key, revenue: 0, count: 0 });
  }
  const plans = new Map();
  for (const payment of approvedPayments) {
    const key = monthKey(new Date(payment.approvedAt));
    const bucket = trend.get(key);
    if (!bucket) continue;
    bucket.revenue += payment.amount;
    bucket.count += 1;
    if (key === currentKey) {
      const name = payment.plan?.name || 'Tanpa paket';
      const entry = plans.get(name) || { name, count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += payment.amount;
      plans.set(name, entry);
    }
  }

  const expiringItems = [
    ...expiringActiveList.map((b) => ({ id: b.id, name: b.name, status: 'ACTIVE', endsAt: b.subscriptionEndAt })),
    ...expiringTrialList.map((b) => ({ id: b.id, name: b.name, status: 'TRIAL', endsAt: b.trialEndAt })),
  ]
    .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
    .slice(0, LIST_LIMIT);

  const sessions = { connected: 0, disconnected: 0, error: 0 };
  for (const group of waSessionGroups) {
    if (Object.hasOwn(sessions, group.status)) sessions[group.status] = group._count._all;
  }
  const queueCount = (status) => waQueueGroups.find((g) => g.status === status)?._count._all || 0;

  const thisMonth = trend.get(currentKey)?.revenue || 0;

  return {
    totalBusinesses,
    activeBusinesses: statusCounts.ACTIVE,
    trialBusinesses: statusCounts.TRIAL,
    pendingPayments,
    monthlyRevenue: thisMonth,
    statusCounts,
    oldestPendingPaymentAt: oldestPending?.createdAt || null,
    revenue: { thisMonth, previousMonth: trend.get(previousKey)?.revenue || 0, trend: [...trend.values()] },
    growth: { newThisMonth, newPreviousMonth },
    conversion: {
      cohortDays: COHORT_DAYS,
      total: cohortTotal,
      converted: cohortConverted,
      rate: cohortTotal ? Math.round((cohortConverted / cohortTotal) * 1000) / 10 : 0,
    },
    expiringSoon: { days: EXPIRING_DAYS, total: expiringActiveCount + expiringTrialCount, items: expiringItems },
    inactive: { days: INACTIVE_DAYS, total: inactiveCount, items: inactiveList },
    planBreakdown: [...plans.values()].sort((a, b) => b.revenue - a.revenue),
    platform: {
      whatsappSessions: sessions,
      queue: { pending: queueCount('PENDING'), failed: queueCount('FAILED') },
    },
  };
};

module.exports = { buildPlatformStats };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && NODE_ENV=test npx jest tests/unit/superAdminStatsService.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/superAdminStatsService.js backend/tests/unit/superAdminStatsService.test.js
git commit -m "feat(superadmin): platform stats service

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Wire stats into the controller

**Files:**
- Modify: `backend/src/controllers/superAdminController.js` (`getDashboardStats`)
- Test: `backend/tests/unit/superAdminController.test.js` (append)

**Interfaces:**
- Consumes: `buildPlatformStats(prisma)` (Task 5).
- Produces: `GET /superadmin/stats` returns the Task 5 shape (legacy keys unchanged).

- [ ] **Step 1: Write the failing test** (append; add `getDashboardStats` to the top destructured require, and add this mock block above the other `jest.mock` calls)

```js
jest.mock('../../src/services/superAdminStatsService', () => ({
  buildPlatformStats: jest.fn(),
}));
const { buildPlatformStats } = require('../../src/services/superAdminStatsService');

describe('getDashboardStats', () => {
  it('delegates to buildPlatformStats and returns its result', async () => {
    buildPlatformStats.mockResolvedValue({ totalBusinesses: 17, monthlyRevenue: 150000 });
    const res = makeRes();
    await getDashboardStats({}, res);
    expect(buildPlatformStats).toHaveBeenCalledWith(prisma);
    expect(res.json).toHaveBeenCalledWith({ totalBusinesses: 17, monthlyRevenue: 150000 });
  });

  it('answers 500 when the service fails', async () => {
    buildPlatformStats.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await getDashboardStats({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && NODE_ENV=test npx jest tests/unit/superAdminController.test.js -t getDashboardStats`
Expected: FAIL (controller still queries prisma directly; `prisma.business.count` etc. are mocks returning undefined).

- [ ] **Step 3: Implement**

Add the require at the top: `const { buildPlatformStats } = require('../services/superAdminStatsService');`

Replace the whole `getDashboardStats` function with:

```js
const getDashboardStats = async (req, res) => {
  try {
    res.json(await buildPlatformStats(prisma));
  } catch (err) {
    sendError(res, err, 500);
  }
};
```

- [ ] **Step 4: Run the full backend suite**

Run: `cd backend && npm test`
Expected: PASS for all suites (the integration suite stays skipped without a DB).

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/superAdminController.js backend/tests/unit/superAdminController.test.js
git commit -m "feat(superadmin): serve platform stats from stats service

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Frontend service + Pagination component

**Files:**
- Modify: `frontend/src/pages/superadmin/services/superAdminService.js`
- Create: `frontend/src/pages/superadmin/components/Pagination.jsx`

**Interfaces:**
- Produces: `superAdminService.getBusinesses(params)`, `.getPayments(params)` (params object → query string), `.deleteBusiness(id, confirmName)`; `<Pagination page limit total onPageChange />` renders nothing when `total <= limit`.

- [ ] **Step 1: Replace the service file**

```js
import superAdminApi from '../../../lib/superAdminAxios';

export const superAdminService = {
  getSession: () => superAdminApi.get('/superadmin/me'),
  logout: () => superAdminApi.post('/superadmin/logout'),
  getStats: () => superAdminApi.get('/superadmin/stats'),
  getBusinesses: (params) => superAdminApi.get('/superadmin/businesses', { params }),
  getPayments: (params) => superAdminApi.get('/superadmin/payments', { params }),
  getPlans: () => superAdminApi.get('/superadmin/plans'),
  approvePayment: (id) => superAdminApi.post(`/superadmin/payments/${id}/approve`),
  rejectPayment: (id, reason) => superAdminApi.post(`/superadmin/payments/${id}/reject`, { reason }),
  toggleBusiness: (id, action) => superAdminApi.post(`/superadmin/businesses/${id}/toggle`, { action }),
  deleteBusiness: (id, confirmName) => superAdminApi.delete(`/superadmin/businesses/${id}`, { data: { confirmName } }),
  savePlan: (payload) => superAdminApi.post('/superadmin/plans', payload),
};
```

- [ ] **Step 2: Create `components/Pagination.jsx`**

```jsx
export default function Pagination({ page, limit, total, onPageChange }) {
  if (!total || total <= limit) return null;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const buttonClass = 'px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

  return (
    <nav aria-label="Navigasi halaman" className="flex items-center justify-between mt-6 text-sm text-slate-400">
      <span>Halaman {page} dari {totalPages} · {total} data</span>
      <div className="flex gap-2">
        <button type="button" className={buttonClass} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Sebelumnya
        </button>
        <button type="button" className={buttonClass} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Berikutnya
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Lint**

Run: `cd frontend && npx eslint src/pages/superadmin/services/superAdminService.js src/pages/superadmin/components/Pagination.jsx`
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/superadmin/services/superAdminService.js frontend/src/pages/superadmin/components/Pagination.jsx
git commit -m "feat(superadmin-ui): service params and pagination component

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Delete confirmation modal + rejection-reason modal

**Files:**
- Modify (replace): `frontend/src/pages/superadmin/components/ConfirmDeleteModal.jsx`
- Modify (replace): `frontend/src/pages/superadmin/components/ProofModal.jsx`

**Interfaces:**
- Produces: `<ConfirmDeleteModal confirmModal={{ id, label }|null} onCancel onConfirm(id, typedName) />` — confirm button disabled until the typed name equals `label` (trimmed). `<ProofModal proofModal={{ id, url, businessName, planName, amount, status }|null} apiBase onClose onApprove(id) onReject(id, reason) />` — approve/reject only shown when `status === 'PENDING'`; reject needs a reason ≥ 5 characters.

- [ ] **Step 1: Replace `ConfirmDeleteModal.jsx`**

```jsx
import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

function DeleteForm({ confirmModal, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === confirmModal.label.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title">
      <form
        className="bg-slate-900 rounded-2xl p-6 max-w-md w-full"
        onSubmit={(e) => { e.preventDefault(); if (matches) onConfirm(confirmModal.id, typed.trim()); }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-500/20 rounded-xl"><AlertTriangle size={24} className="text-red-400" aria-hidden="true" /></div>
          <div>
            <h3 id="confirm-delete-title" className="text-white font-bold">Nonaktifkan Toko?</h3>
            <p className="text-slate-400 text-sm">Toko tidak bisa login lagi.</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm mb-4">
          Toko <strong className="text-white">{confirmModal.label}</strong> akan dinonaktifkan dan disembunyikan dari daftar.
          Data transaksi, pelanggan, dan layanan tetap tersimpan dan dapat dipulihkan oleh tim teknis.
        </p>
        <label htmlFor="confirm-delete-name" className="block text-xs font-semibold text-slate-400 mb-2">
          Ketik nama toko persis untuk melanjutkan
        </label>
        <input
          id="confirm-delete-name"
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="w-full mb-6 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-red-400"
          placeholder={confirmModal.label}
        />
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-semibold">Batal</button>
          <button
            type="submit"
            disabled={!matches}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={16} aria-hidden="true" /> Nonaktifkan
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ConfirmDeleteModal({ confirmModal, onCancel, onConfirm }) {
  if (!confirmModal) return null;
  return <DeleteForm key={confirmModal.id} confirmModal={confirmModal} onCancel={onCancel} onConfirm={onConfirm} />;
}
```

- [ ] **Step 2: Replace `ProofModal.jsx`**

```jsx
import { useState } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { formatIDR } from '../constants';

const MIN_REASON_LENGTH = 5;

function ProofContent({ proofModal, apiBase, onClose, onApprove, onReject }) {
  const [reason, setReason] = useState('');
  const canReject = reason.trim().length >= MIN_REASON_LENGTH;
  const isPending = proofModal.status === 'PENDING';

  const imageUrl = proofModal.url.startsWith('/uploads')
    ? `${apiBase.replace('/api', '')}${proofModal.url}`
    : proofModal.url;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-modal-title"
      onClick={onClose}
    >
      <div className="bg-slate-900 rounded-2xl p-4 max-w-lg w-full max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 id="proof-modal-title" className="text-white font-bold">Bukti Pembayaran</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Tutup dialog bukti pembayaran">
            <X size={20} />
          </button>
        </div>
        <img src={imageUrl} alt="Bukti transfer pembayaran" className="w-full rounded-xl max-h-96 object-contain bg-white" />
        <div className="mt-3 text-slate-400 text-sm space-y-1">
          <p>Toko: <span className="text-white font-semibold">{proofModal.businessName}</span></p>
          <p>Paket: <span className="text-white">{proofModal.planName}</span></p>
          <p>Nominal: <span className="text-white font-bold">{formatIDR(proofModal.amount)}</span></p>
        </div>

        {isPending && (
          <>
            <label htmlFor="reject-reason" className="block text-xs font-semibold text-slate-400 mt-4 mb-2">
              Alasan penolakan (wajib jika menolak, min. {MIN_REASON_LENGTH} karakter)
            </label>
            <textarea
              id="reject-reason"
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-400"
              placeholder="Contoh: Nominal transfer tidak sesuai"
            />
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => { onApprove(proofModal.id); onClose(); }} className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                <CheckCircle size={16} aria-hidden="true" /> Approve
              </button>
              <button
                type="button"
                disabled={!canReject}
                onClick={() => { onReject(proofModal.id, reason.trim()); onClose(); }}
                className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500/20 text-red-400 hover:text-white disabled:hover:text-red-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={16} aria-hidden="true" /> Tolak
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProofModal({ proofModal, apiBase, onClose, onApprove, onReject }) {
  if (!proofModal) return null;
  return <ProofContent key={proofModal.id} proofModal={proofModal} apiBase={apiBase} onClose={onClose} onApprove={onApprove} onReject={onReject} />;
}
```

- [ ] **Step 3: Lint**

Run: `cd frontend && npx eslint src/pages/superadmin/components/ConfirmDeleteModal.jsx src/pages/superadmin/components/ProofModal.jsx`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/superadmin/components/ConfirmDeleteModal.jsx frontend/src/pages/superadmin/components/ProofModal.jsx
git commit -m "fix(superadmin-ui): typed-name delete confirm and rejection reason input

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Businesses and Payments tabs

**Files:**
- Modify (replace): `frontend/src/pages/superadmin/tabs/BusinessesTab.jsx`
- Modify: `frontend/src/pages/superadmin/tabs/PaymentsTab.jsx`

**Interfaces:**
- Consumes: `Pagination` (Task 7).
- Produces: `<BusinessesTab businesses loading error query={{page,search,status}} total limit onQueryChange(partial) onRefresh onToggle(id,status) onDeleteRequest({id,label}) />`. `<PaymentsTab payments loading error page total limit onPageChange paymentFilter setPaymentFilter onRefresh onViewProof(payment) />` (the quick Approve/Tolak buttons are removed in favour of the proof modal which carries the reason field; `onApprove`/`onReject` props are no longer used by this tab).

- [ ] **Step 1: Replace `BusinessesTab.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Power, Trash2, Loader2, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { STATUS_BADGE, STATUS_LABEL } from '../constants';
import Pagination from '../components/Pagination';

const STATUS_OPTIONS = ['TRIAL', 'ACTIVE', 'PENDING_PAYMENT', 'EXPIRED', 'SUSPENDED'];

export default function BusinessesTab({
  businesses, loading, error, query, total, limit, onQueryChange, onRefresh, onToggle, onDeleteRequest,
}) {
  const [searchInput, setSearchInput] = useState(query.search);

  useEffect(() => {
    if (searchInput === query.search) return undefined;
    const timer = setTimeout(() => onQueryChange({ search: searchInput, page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [searchInput, query.search, onQueryChange]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Manajemen Toko</h1>
          <p className="text-slate-400">Kelola seluruh tenant WashPro{total ? ` · ${total} toko` : ''}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama toko…"
              aria-label="Cari nama toko"
              className="pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-400"
            />
          </div>
          <select
            value={query.status}
            onChange={(e) => onQueryChange({ status: e.target.value, page: 1 })}
            aria-label="Filter status toko"
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Semua status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button type="button" onClick={onRefresh} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors" aria-label="Muat ulang daftar toko">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 bg-red-500/10 border border-red-400/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertCircle size={16} aria-hidden="true" /> {error}</span>
          <button type="button" onClick={onRefresh} className="font-semibold underline">Coba lagi</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500" role="status" aria-live="polite">
          <Loader2 size={24} className="animate-spin mr-2" aria-hidden="true" /> Memuat...
        </div>
      ) : businesses.length === 0 && !error ? (
        <div className="text-center py-16 text-slate-600">Tidak ada toko yang cocok dengan filter ini.</div>
      ) : (
        <div className="space-y-3">
          {businesses.map((b) => (
            <div key={b.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-white font-bold">{b.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_BADGE[b.subscriptionStatus]}`}>
                    {STATUS_LABEL[b.subscriptionStatus]}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{b.users?.[0]?.name} · {b.users?.[0]?.email}</p>
                <div className="flex gap-4 mt-1 text-xs text-slate-600 flex-wrap">
                  <span>{b._count?.transactions} transaksi</span>
                  <span>{b._count?.customers} pelanggan</span>
                  {b.subscriptionEndAt && <span>Aktif s/d {new Date(b.subscriptionEndAt).toLocaleDateString('id-ID')}</span>}
                  {!b.subscriptionEndAt && b.trialEndAt && <span>Trial s/d {new Date(b.trialEndAt).toLocaleDateString('id-ID')}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onToggle(b.id, b.subscriptionStatus)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    b.subscriptionStatus === 'SUSPENDED'
                      ? 'bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white'
                      : 'bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-white'
                  }`}
                >
                  <Power size={14} aria-hidden="true" />
                  {b.subscriptionStatus === 'SUSPENDED' ? 'Aktifkan' : 'Tangguhkan'}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRequest({ id: b.id, label: b.name })}
                  className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-sm font-semibold transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={14} aria-hidden="true" /> Nonaktifkan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={query.page} limit={limit} total={total} onPageChange={(page) => onQueryChange({ page })} />
    </div>
  );
}
```

- [ ] **Step 2: Edit `PaymentsTab.jsx`**

2a. Replace the imports and component signature (top of file through the opening of the returned `<div>`):

old:
```jsx
import { CheckCircle, XCircle, Eye, Loader2, RefreshCw } from 'lucide-react';
import { formatIDR, STATUS_BADGE, STATUS_LABEL } from '../constants';

export default function PaymentsTab({
  payments,
  loading,
  paymentFilter,
  setPaymentFilter,
  onRefresh,
  onViewProof,
  onApprove,
  onReject,
}) {
```
new:
```jsx
import { Eye, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { formatIDR, STATUS_BADGE, STATUS_LABEL } from '../constants';
import Pagination from '../components/Pagination';

export default function PaymentsTab({
  payments,
  loading,
  error,
  page,
  total,
  limit,
  onPageChange,
  paymentFilter,
  setPaymentFilter,
  onRefresh,
  onViewProof,
}) {
```

2b. Directly before `{loading ? (` insert:

```jsx
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 bg-red-500/10 border border-red-400/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertCircle size={16} aria-hidden="true" /> {error}</span>
          <button type="button" onClick={onRefresh} className="font-semibold underline">Coba lagi</button>
        </div>
      )}
```

2c. Replace the empty-state condition `) : payments.length === 0 ? (` with `) : payments.length === 0 && !error ? (`.

2d. Replace the whole `{p.status === 'PENDING' && ( <> ...approve/tolak buttons... </> )}` block with:

```jsx
                {p.status === 'PENDING' && (
                  <button type="button" onClick={() => onViewProof(p)} className="px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white text-sm font-semibold transition-all">
                    Tinjau & Putuskan
                  </button>
                )}
                {p.status === 'REJECTED' && p.rejectionReason && (
                  <span className="self-center text-xs text-slate-500 max-w-[14rem] truncate" title={p.rejectionReason}>
                    Alasan: {p.rejectionReason}
                  </span>
                )}
```

2e. Replace the final closing of the list (`        </div>\n      )}\n    </div>\n  );\n}`) so that `Pagination` renders after the list:

```jsx
        </div>
      )}

      <Pagination page={page} limit={limit} total={total} onPageChange={onPageChange} />
    </div>
  );
}
```

- [ ] **Step 3: Lint**

Run: `cd frontend && npx eslint src/pages/superadmin/tabs/BusinessesTab.jsx src/pages/superadmin/tabs/PaymentsTab.jsx`
Expected: clean (no unused imports: `CheckCircle`/`XCircle` were removed).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/superadmin/tabs/BusinessesTab.jsx frontend/src/pages/superadmin/tabs/PaymentsTab.jsx
git commit -m "feat(superadmin-ui): search, filter, pagination and error states for lists

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: DashboardTab redesign

**Files:**
- Modify (replace): `frontend/src/pages/superadmin/tabs/DashboardTab.jsx`

**Interfaces:**
- Consumes: stats shape from Task 5.
- Produces: `<DashboardTab stats error onRetry onNavigate(tabId) />`.

- [ ] **Step 1: Replace the file**

```jsx
import {
  Store, CheckCircle, Clock, CreditCard, TrendingUp, TrendingDown, Hourglass, Ban,
  UserPlus, Percent, MessageSquare, Moon, AlertTriangle, AlertCircle, RefreshCw,
} from 'lucide-react';
import { formatIDR, STATUS_LABEL } from '../constants';

const TONES = {
  indigo: 'bg-indigo-500/10 border-indigo-400/20 text-indigo-400',
  green: 'bg-green-500/10 border-green-400/20 text-green-400',
  blue: 'bg-blue-500/10 border-blue-400/20 text-blue-400',
  red: 'bg-red-500/10 border-red-400/20 text-red-400',
  slate: 'bg-slate-500/10 border-slate-400/20 text-slate-300',
  amber: 'bg-amber-500/10 border-amber-400/20 text-amber-400',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFrom = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
const daysUntil = (iso) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS));
const monthLabel = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' });

function change(current, previous) {
  if (!previous) return current > 0 ? { text: 'Baru', up: true } : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { text: `${Math.abs(pct)}%`, up: pct >= 0 };
}

function Delta({ value, suffix }) {
  if (!value) return null;
  const Icon = value.up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${value.up ? 'text-green-400' : 'text-red-400'}`}>
      <Icon size={12} aria-hidden="true" /> {value.text} <span className="text-slate-500 font-medium">{suffix}</span>
    </span>
  );
}

function Panel({ title, icon, action, children }) {
  const PanelIcon = icon;
  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-white font-bold flex items-center gap-2">
          <PanelIcon size={18} className="text-slate-400" aria-hidden="true" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function DashboardTab({ stats, error, onRetry, onNavigate }) {
  const header = (
    <>
      <h1 className="text-2xl font-black text-white mb-2">Dashboard</h1>
      <p className="text-slate-400 mb-8">Ringkasan platform WashPro SaaS</p>
    </>
  );

  if (!stats) {
    return (
      <div>
        {header}
        {error ? (
          <div role="alert" className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-400/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
            <span className="flex items-center gap-2"><AlertCircle size={16} aria-hidden="true" /> {error}</span>
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 font-semibold underline">
              <RefreshCw size={14} aria-hidden="true" /> Coba lagi
            </button>
          </div>
        ) : (
          <div className="text-slate-500" role="status">Memuat statistik...</div>
        )}
      </div>
    );
  }

  const { statusCounts: sc, revenue, growth, conversion, expiringSoon, inactive, platform } = stats;
  const tiles = [
    { label: 'Total Toko', value: stats.totalBusinesses, icon: Store, tone: 'indigo' },
    { label: 'Aktif', value: sc.ACTIVE, icon: CheckCircle, tone: 'green' },
    { label: 'Trial', value: sc.TRIAL, icon: Clock, tone: 'blue' },
    { label: 'Kadaluarsa', value: sc.EXPIRED, icon: Hourglass, tone: 'red' },
    { label: 'Ditangguhkan', value: sc.SUSPENDED, icon: Ban, tone: 'slate' },
  ];
  const trendMax = Math.max(1, ...revenue.trend.map((m) => m.revenue));
  const sessions = platform.whatsappSessions;
  const oldestPendingDays = stats.oldestPendingPaymentAt ? daysFrom(stats.oldestPendingPaymentAt) : null;

  return (
    <div className="space-y-6">
      <div>{header}</div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-400/30 text-amber-300 rounded-2xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertCircle size={16} aria-hidden="true" /> {error}</span>
          <button type="button" onClick={onRetry} className="font-semibold underline">Muat ulang</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {tiles.map((item) => {
          const TileIcon = item.icon;
          return (
            <div key={item.label} className={`${TONES[item.tone]} border rounded-2xl p-5`}>
              <TileIcon size={20} className="mb-3" aria-hidden="true" />
              <p className="text-3xl font-black text-white">{item.value}</p>
              <p className="text-slate-400 text-sm mt-1">{item.label}</p>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => onNavigate('payments')}
          className={`${stats.pendingPayments > 0 ? TONES.amber : TONES.slate} border rounded-2xl p-5 text-left hover:brightness-125 transition`}
        >
          <CreditCard size={20} className="mb-3" aria-hidden="true" />
          <p className="text-3xl font-black text-white">{stats.pendingPayments}</p>
          <p className="text-slate-400 text-sm mt-1">Menunggu Konfirmasi</p>
          {oldestPendingDays !== null && (
            <p className="text-xs text-amber-300 mt-1">Tertua {oldestPendingDays} hari</p>
          )}
        </button>
      </div>

      <Panel title="Pendapatan Langganan" icon={TrendingUp}>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64 flex-shrink-0">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Bulan ini</p>
            <p className="text-4xl font-black text-green-400">{formatIDR(revenue.thisMonth)}</p>
            <div className="mt-2">
              <Delta value={change(revenue.thisMonth, revenue.previousMonth)} suffix="vs bulan lalu" />
            </div>
            <p className="text-slate-500 text-sm mt-3">Bulan lalu {formatIDR(revenue.previousMonth)}</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-end gap-3 h-40" role="img" aria-label="Grafik pendapatan 6 bulan terakhir">
              {revenue.trend.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${monthLabel(m.month)}: ${formatIDR(m.revenue)} (${m.count} pembayaran)`}>
                  <span className="text-[10px] text-slate-500">{m.revenue > 0 ? `${Math.round(m.revenue / 1000)}k` : ''}</span>
                  <div
                    className="w-full rounded-t-md bg-indigo-400/70"
                    style={{ height: `${Math.max(m.revenue > 0 ? 4 : 1, Math.round((m.revenue / trendMax) * 100))}%` }}
                  />
                  <span className="text-xs text-slate-400">{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Pertumbuhan Toko" icon={UserPlus}>
          <p className="text-3xl font-black text-white">{growth.newThisMonth}</p>
          <p className="text-slate-400 text-sm">toko baru bulan ini</p>
          <div className="mt-2"><Delta value={change(growth.newThisMonth, growth.newPreviousMonth)} suffix="vs bulan lalu" /></div>
        </Panel>
        <Panel title="Konversi Trial → Berbayar" icon={Percent}>
          <p className="text-3xl font-black text-white">{conversion.rate}%</p>
          <p className="text-slate-400 text-sm">
            {conversion.converted} dari {conversion.total} toko baru ({conversion.cohortDays} hari terakhir)
          </p>
        </Panel>
        <Panel title="Kesehatan WhatsApp Tenant" icon={MessageSquare}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xl font-black text-green-400">{sessions.connected}</p><p className="text-xs text-slate-500">Terhubung</p></div>
            <div><p className="text-xl font-black text-slate-300">{sessions.disconnected}</p><p className="text-xs text-slate-500">Terputus</p></div>
            <div><p className="text-xl font-black text-red-400">{sessions.error}</p><p className="text-xs text-slate-500">Error</p></div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Antrian pesan: {platform.queue.pending} menunggu ·{' '}
            <span className={platform.queue.failed > 0 ? 'text-red-400 font-semibold' : ''}>{platform.queue.failed} gagal</span>
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title={`Segera Berakhir (≤ ${expiringSoon.days} hari)`}
          icon={AlertTriangle}
          action={expiringSoon.total > 0 && (
            <span className="text-xs text-amber-300 font-semibold">{expiringSoon.total} toko</span>
          )}
        >
          {expiringSoon.items.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">Tidak ada toko yang segera berakhir.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {expiringSoon.items.map((b) => (
                <li key={b.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{b.name}</p>
                    <p className="text-xs text-slate-500">{STATUS_LABEL[b.status]} · s/d {new Date(b.endsAt).toLocaleDateString('id-ID')}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-300 whitespace-nowrap">{daysUntil(b.endsAt)} hari lagi</span>
                </li>
              ))}
            </ul>
          )}
          {expiringSoon.total > expiringSoon.items.length && (
            <button type="button" onClick={() => onNavigate('businesses')} className="mt-3 text-sm text-indigo-300 hover:text-white font-semibold">
              Lihat semua toko →
            </button>
          )}
        </Panel>

        <Panel
          title={`Toko Aktif Tanpa Transaksi (${inactive.days}+ hari)`}
          icon={Moon}
          action={inactive.total > 0 && <span className="text-xs text-slate-400 font-semibold">{inactive.total} toko</span>}
        >
          {inactive.items.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">Semua toko aktif sedang bertransaksi.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {inactive.items.map((b) => (
                <li key={b.id} className="py-3 text-white text-sm font-semibold truncate">{b.name}</li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Pembayaran per Paket (Bulan Ini)" icon={CreditCard}>
        {stats.planBreakdown.length === 0 ? (
          <p className="text-slate-500 text-sm">Belum ada pembayaran yang disetujui bulan ini.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-2 font-semibold">Paket</th>
                <th className="pb-2 font-semibold text-right">Pembayaran</th>
                <th className="pb-2 font-semibold text-right">Pendapatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.planBreakdown.map((p) => (
                <tr key={p.name}>
                  <td className="py-2 text-white font-semibold">{p.name}</td>
                  <td className="py-2 text-right text-slate-300">{p.count}</td>
                  <td className="py-2 text-right text-green-400 font-bold">{formatIDR(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `cd frontend && npx eslint src/pages/superadmin/tabs/DashboardTab.jsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/superadmin/tabs/DashboardTab.jsx
git commit -m "feat(superadmin-ui): SaaS metrics dashboard

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Wire everything in SuperAdminDashboard

**Files:**
- Modify (replace): `frontend/src/pages/superadmin/SuperAdminDashboard.jsx`

**Interfaces:**
- Consumes: service (Task 7), modals (Task 8), tabs (Tasks 9, 10).

- [ ] **Step 1: Replace the file**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, CreditCard, Package, LogOut,
  CheckCircle, XCircle, MessageSquare,
} from 'lucide-react';
import { NAV_ITEMS } from './constants';
import { superAdminService } from './services/superAdminService';
import ProofModal from './components/ProofModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import PlanModal from './components/PlanModal';
import DashboardTab from './tabs/DashboardTab';
import PaymentsTab from './tabs/PaymentsTab';
import BusinessesTab from './tabs/BusinessesTab';
import PlansTab from './tabs/PlansTab';
import WhatsAppTab from './tabs/WhatsAppTab';

const TAB_ICONS = {
  dashboard: LayoutDashboard,
  payments: CreditCard,
  businesses: Store,
  plans: Package,
  whatsapp: MessageSquare,
};

const PAGE_SIZE = 20;
const apiMessage = (err, fallback) => err.response?.data?.message || err.response?.data?.error || fallback;

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [businessQuery, setBusinessQuery] = useState({ page: 1, search: '', status: '' });
  const [businessTotal, setBusinessTotal] = useState(0);
  const [payments, setPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('PENDING');
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [proofModal, setProofModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [planModal, setPlanModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const r = await superAdminService.getStats();
      setStats(r.data);
      setStatsError('');
    } catch (err) {
      setStatsError(apiMessage(err, 'Gagal memuat statistik platform.'));
    }
  }, []);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const params = { page: businessQuery.page, limit: PAGE_SIZE };
      if (businessQuery.search) params.search = businessQuery.search;
      if (businessQuery.status) params.status = businessQuery.status;
      const r = await superAdminService.getBusinesses(params);
      setBusinesses(r.data.businesses || []);
      setBusinessTotal(r.data.total || 0);
    } catch (err) {
      setBusinesses([]);
      setListError(apiMessage(err, 'Gagal memuat daftar toko.'));
    } finally {
      setLoading(false);
    }
  }, [businessQuery]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const r = await superAdminService.getPayments({ status: paymentFilter, page: paymentPage, limit: PAGE_SIZE });
      setPayments(r.data.payments || []);
      setPaymentTotal(r.data.total || 0);
    } catch (err) {
      setPayments([]);
      setListError(apiMessage(err, 'Gagal memuat daftar pembayaran.'));
    } finally {
      setLoading(false);
    }
  }, [paymentFilter, paymentPage]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const r = await superAdminService.getPlans();
      setPlans(r.data || []);
    } catch (err) {
      setListError(apiMessage(err, 'Gagal memuat daftar paket.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    superAdminService.getSession()
      .then((r) => setAdmin(r.data.admin))
      .catch(() => navigate('/superadmin/login'));
    fetchStats();
  }, [fetchStats, navigate]);

  useEffect(() => { if (tab === 'dashboard') fetchStats(); }, [tab, fetchStats]);
  useEffect(() => { if (tab === 'businesses') fetchBusinesses(); }, [tab, fetchBusinesses]);
  useEffect(() => { if (tab === 'payments') fetchPayments(); }, [tab, fetchPayments]);
  useEffect(() => { if (tab === 'plans') fetchPlans(); }, [tab, fetchPlans]);

  const changeTab = (id) => {
    setListError('');
    setTab(id);
  };

  const updateBusinessQuery = useCallback((partial) => {
    setBusinessQuery((prev) => ({ ...prev, ...partial }));
  }, []);

  const changePaymentFilter = (status) => {
    setPaymentFilter(status);
    setPaymentPage(1);
  };

  const handleApprove = async (paymentId) => {
    try {
      await superAdminService.approvePayment(paymentId);
      showToast('Pembayaran berhasil disetujui!');
      fetchPayments();
      fetchStats();
    } catch (err) {
      showToast(apiMessage(err, 'Gagal approve'), 'error');
    }
  };

  const handleReject = async (paymentId, reason) => {
    try {
      await superAdminService.rejectPayment(paymentId, reason);
      showToast('Pembayaran ditolak.');
      fetchPayments();
      fetchStats();
    } catch (err) {
      showToast(apiMessage(err, 'Gagal reject'), 'error');
    }
  };

  const handleToggle = async (businessId, currentStatus) => {
    const action = currentStatus === 'SUSPENDED' ? 'ACTIVATE' : 'SUSPEND';
    try {
      const r = await superAdminService.toggleBusiness(businessId, action);
      showToast(r.data?.message || 'Status toko diperbarui');
      fetchBusinesses();
      fetchStats();
    } catch (err) {
      showToast(apiMessage(err, 'Gagal mengubah status toko'), 'error');
    }
  };

  const handleDelete = async (businessId, confirmName) => {
    try {
      const r = await superAdminService.deleteBusiness(businessId, confirmName);
      showToast(r.data?.message || 'Toko berhasil dinonaktifkan');
      setConfirmModal(null);
      fetchBusinesses();
      fetchStats();
    } catch (err) {
      showToast(apiMessage(err, 'Gagal menonaktifkan toko'), 'error');
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      const featuresArr = typeof planModal.features === 'string'
        ? planModal.features.split('\n').filter((f) => f.trim() !== '')
        : planModal.features;

      await superAdminService.savePlan({
        id: planModal.id,
        name: planModal.name,
        price: Number(planModal.price),
        durationDays: Number(planModal.durationDays),
        features: featuresArr,
        isActive: planModal.isActive,
      });
      showToast('Paket berhasil disimpan!');
      setPlanModal(null);
      fetchPlans();
    } catch (err) {
      showToast(apiMessage(err, 'Gagal menyimpan paket'), 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await superAdminService.logout();
    } catch {
      /* best-effort */
    }
    navigate('/superadmin/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside className="w-56 bg-slate-900 border-r border-white/5 flex flex-col py-6 flex-shrink-0" aria-label="Navigasi Super Admin">
        <div className="px-5 mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="WashPro Logo" className="w-8 h-8 object-contain" width="32" height="32" />
          <div>
            <p className="text-white font-black text-lg leading-tight">WashPro</p>
            <p className="text-indigo-400 text-xs font-semibold">Super Admin</p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const ItemIcon = TAB_ICONS[item.id];
            const badge = item.id === 'payments' ? stats?.pendingPayments : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => changeTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <ItemIcon size={18} aria-hidden="true" />
                <span>{item.label}</span>
                {badge > 0 && <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="px-3 mt-4">
          <div className="px-3 py-2 mb-3">
            <p className="text-white text-sm font-semibold">{admin?.name || 'Super Admin'}</p>
            <p className="text-slate-500 text-xs">{admin?.email}</p>
          </div>
          <button type="button" onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={16} aria-hidden="true" /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-semibold text-sm flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`} role="status" aria-live="polite">
            {toast.type === 'error' ? <XCircle size={16} aria-hidden="true" /> : <CheckCircle size={16} aria-hidden="true" />}
            {toast.msg}
          </div>
        )}

        <ProofModal
          proofModal={proofModal}
          apiBase={API_BASE}
          onClose={() => setProofModal(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
        <ConfirmDeleteModal
          confirmModal={confirmModal}
          onCancel={() => setConfirmModal(null)}
          onConfirm={handleDelete}
        />
        <PlanModal
          planModal={planModal}
          setPlanModal={setPlanModal}
          onSave={handleSavePlan}
          onClose={() => setPlanModal(null)}
        />

        <div className="p-8">
          {tab === 'dashboard' && (
            <DashboardTab stats={stats} error={statsError} onRetry={fetchStats} onNavigate={changeTab} />
          )}
          {tab === 'payments' && (
            <PaymentsTab
              payments={payments}
              loading={loading}
              error={listError}
              page={paymentPage}
              total={paymentTotal}
              limit={PAGE_SIZE}
              onPageChange={setPaymentPage}
              paymentFilter={paymentFilter}
              setPaymentFilter={changePaymentFilter}
              onRefresh={fetchPayments}
              onViewProof={(p) => setProofModal({
                id: p.id,
                url: p.proofOfPayment,
                businessName: p.business?.name,
                planName: p.plan?.name,
                amount: p.amount,
                status: p.status,
              })}
            />
          )}
          {tab === 'businesses' && (
            <BusinessesTab
              businesses={businesses}
              loading={loading}
              error={listError}
              query={businessQuery}
              total={businessTotal}
              limit={PAGE_SIZE}
              onQueryChange={updateBusinessQuery}
              onRefresh={fetchBusinesses}
              onToggle={handleToggle}
              onDeleteRequest={setConfirmModal}
            />
          )}
          {tab === 'plans' && (
            <>
              {listError && (
                <div role="alert" className="mb-4 flex items-center justify-between gap-3 bg-red-500/10 border border-red-400/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
                  <span>{listError}</span>
                  <button type="button" onClick={fetchPlans} className="font-semibold underline">Coba lagi</button>
                </div>
              )}
              <PlansTab
                plans={plans}
                loading={loading}
                onRefresh={fetchPlans}
                onAdd={() => setPlanModal({ name: '', price: 50000, durationDays: 30, features: 'Kasir Tanpa Batas\nLaporan Keuangan\nManajemen Staf', isActive: true })}
                onEdit={(p) => setPlanModal({ id: p.id, name: p.name, price: p.price, durationDays: p.durationDays, features: Array.isArray(p.features) ? p.features.join('\n') : '', isActive: p.isActive })}
              />
            </>
          )}
          {tab === 'whatsapp' && <WhatsAppTab />}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Lint the whole super admin folder**

Run: `cd frontend && npx eslint src/pages/superadmin`
Expected: clean. If `react-hooks/set-state-in-effect` fires for the `useEffect` calls that run fetchers, follow the pattern already accepted in `src/pages/Dashboard.jsx` (async fetcher invoked from the effect; the setState calls live inside the async function, not the effect body).

- [ ] **Step 3: Build**

Run: `cd frontend && npm run build`
Expected: both Vite builds succeed and "SEO build: prerendered homepage…" prints.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/superadmin/SuperAdminDashboard.jsx
git commit -m "feat(superadmin-ui): wire pagination, errors, delete and reject flows

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: End-to-end verification

**Files:** none modified (evidence only).

- [ ] **Step 1: Full backend suite**

Run: `cd backend && npm test`
Expected: all suites PASS (existing 14 + 3 new); only the integration suite skipped.

- [ ] **Step 2: Migration against a fresh database (all migrations, new one included)**

```bash
docker run -d --name washpro-migtest -e MYSQL_ROOT_PASSWORD=pw -e MYSQL_DATABASE=washpro -p 33999:3306 mysql:8.0
until docker exec washpro-migtest mysql -uroot -ppw -e "select 1" washpro >/dev/null 2>&1; do sleep 2; done
cd backend && DATABASE_URL="mysql://root:pw@127.0.0.1:33999/washpro" npx prisma migrate deploy
DATABASE_URL="mysql://root:pw@127.0.0.1:33999/washpro" npx prisma migrate diff --from-url "mysql://root:pw@127.0.0.1:33999/washpro" --to-schema-datamodel prisma/schema.prisma --script | grep -v "updated_at"
```
Expected: "All migrations have been successfully applied"; the diff prints nothing besides the known, pre-existing `updated_at DROP DEFAULT` lines (filtered out).

- [ ] **Step 3: Smoke the real queries against that database** (the unit tests mock Prisma, so this is the only check that the Prisma `where` shapes are valid)

```bash
cd backend && DATABASE_URL="mysql://root:pw@127.0.0.1:33999/washpro" node -e "
const { PrismaClient } = require('@prisma/client');
const { buildPlatformStats } = require('./src/services/superAdminStatsService');
const prisma = new PrismaClient();
buildPlatformStats(prisma).then((s) => { console.log(JSON.stringify(s, null, 2)); return prisma.\$disconnect(); })
  .catch((e) => { console.error(e); process.exit(1); });
"
```
Expected: JSON with all keys from the Task 5 interface, zero counts, `revenue.trend` of 6 months, no Prisma validation error.

- [ ] **Step 4: Remove the throwaway database**

Run: `docker rm -f washpro-migtest`

- [ ] **Step 5: Frontend gate**

Run: `cd frontend && npx eslint src/pages/superadmin && npm run build`
Expected: clean lint and successful build.

- [ ] **Step 6: Manual UI checklist** (needs a running backend + seeded super admin; report any item that could not be exercised instead of claiming it passed)
  - Dashboard tab shows tiles, revenue panel, lists; forcing the API to fail shows the red banner with "Coba lagi".
  - Toko tab: type in search (debounced), change status filter, page through with >20 stores.
  - Nonaktifkan: confirm button stays disabled until the exact name is typed; request succeeds; store disappears from list and from stats `totalBusinesses`.
  - Suspend a TRIAL store with an expired trial, then Aktifkan: toast says "Kadaluarsa" and the store is not ACTIVE.
  - Pembayaran tab: "Tinjau & Putuskan" opens modal; Tolak is disabled until ≥ 5 characters; rejected row shows the reason; DB row has `rejected_by_id` set and `approved_by_id` NULL.

---

## Self-Review

**Spec coverage**
- F1 → Task 7 (service sends `confirmName`), Task 8 (typed-name modal, honest copy), Task 11 (passes name through, uses server message). ✔
- F2 → Task 1 (rule), Task 3 (controller + tests), Task 11 (shows server message). ✔
- F3 → Task 4 (backend), Tasks 7, 9, 11 (frontend search/filter/pagination). ✔
- F4 → Task 5 (`where: { deletedAt: null }` on every business count/group; asserted in test). ✔
- F5 → Tasks 9, 10, 11 (error banners + retry on dashboard, businesses, payments, and plans via a banner in `SuperAdminDashboard`). ✔
- F6 → Task 3. ✔
- F7 → Tasks 2, 3 (columns + controller), Task 8 (reason input), Task 9 (rejected reason display). ✔
- F8 → Tasks 5, 6, 10. ✔

**Placeholder scan:** no TBD/TODO; every code step contains full code or exact old/new replacements.

**Type consistency:** `resolveReactivationStatus` signature (Task 1) matches usage (Task 3). `buildPlatformStats(prisma, now)` (Task 5) is called as `buildPlatformStats(prisma)` (Task 6) and asserted so. Stats keys used in `DashboardTab` (`statusCounts`, `revenue.{thisMonth,previousMonth,trend}`, `growth`, `conversion`, `expiringSoon.{days,total,items}`, `inactive`, `planBreakdown`, `platform.{whatsappSessions,queue}`, `oldestPendingPaymentAt`, `pendingPayments`, `totalBusinesses`) all exist in the Task 5 output. List response keys (`businesses|payments`, `total`) match `fetchBusinesses`/`fetchPayments`.

**Known limitations (intentional, YAGNI)**
- Frontend has no component tests (no runner in repo); gate is lint + build + manual checklist.
- `buildPlatformStats` issues ~18 parallel queries per dashboard load; acceptable for a low-traffic admin view, and each hits an indexed or small table. The `Business` table has no secondary indexes (small table).
- `inactive.items` lists stores in creation order, not by last-transaction date, to avoid an extra per-store query.
