# Staff/Cashier Dashboard Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` for native execution, or `superpowers:subagent-driven-development` if the user selects delegation. Implement task-by-task using the checkboxes below. This approved plan has been implemented; verification evidence is recorded below.

**Goal:** Menutup delapan masalah audit dashboard staff/kasir: preview membership, nama pelanggan, status penyimpanan, nota WhatsApp, kegagalan pemuatan data, permission UI, periode tujuh hari, dan timezone pesanan hari ini.

**Architecture:** Backend tetap menjadi sumber nominal transaksi dan otorisasi. Frontend memakai helper murni untuk preview dan nota, state terpisah untuk penyimpanan/pengiriman/pemuatan, serta permission gate yang membaca settings. Kalender bisnis dipatok ke WIB; perubahan helper tanggal bersama juga diverifikasi pada halaman laporan.

**Tech Stack:** Express 5, Prisma 6/MySQL 8, Jest 30, React 19, Vite 8, Tailwind 4, Node `node:test`, Playwright Chromium. Gunakan dependency yang sudah terpasang.

**Spec:** [Spesifikasi dan keputusan produk](#spesifikasi-dan-keputusan-produk) dalam dokumen ini. Baseline: commit `114c2fc` pada branch `feat/superadmin-dashboard-hardening`.

## Global Constraints

- Nama pelanggan **selalu wajib**. Keputusan eksplisit user: hapus opsi menonaktifkan field nama; jangan mengganti dengan pelanggan anonim.
- Kalender bisnis menggunakan **WIB / Asia/Jakarta / UTC+7**, termasuk saat browser atau server memakai UTC atau timezone lain.
- Bahasa UI Indonesia, tampilan mengikuti dashboard dan kasir yang ada.
- Tidak menambah dependency npm, tidak mengubah model/kolom database, dan tidak menghapus data bisnis.
- Backend menghitung harga, membership, dan payable dari database; preview frontend tidak dapat menentukan nominal yang disimpan.
- Pertahankan optimasi batch lookup dan update kuota serta isolasi `businessId` yang sudah ada.
- API permission tetap authoritative. Menghilangkan tautan atau menambah route gate frontend tidak menggantikan middleware backend.
- Test yang menulis database hanya dijalankan di MySQL test terisolasi `washpro_test` atau `washpro_ci`; gunakan gateway WhatsApp nonaktif.
- Jangan mengubah konfigurasi permission owner melalui test pada data asli. Fixture harus dipulihkan setelah test.
- Dokumentasi plan boleh dibuat sekarang; implementasi, commit implementasi, dan push mengikuti instruksi user saat eksekusi.

## Spesifikasi dan keputusan produk

### Matriks penutupan temuan

| ID | Temuan audit | Perilaku akhir | Task |
|---|---|---|---|
| F1 | Baris layanan duplikat memakai saldo membership yang sama berulang kali | Gabungkan qty per service sebelum preview; total/coverage/rounding konsisten dengan backend | 2 |
| F2 | Nama dapat disembunyikan, tetapi backend mewajibkannya | Field selalu tampil dan required, toggle dihapus, settings lama `false` tetap dapat digunakan | 1 |
| F3 | Refresh pelanggan gagal setelah POST sukses menimpa pesan transaksi tersimpan | POST sukses menjadi status final penyimpanan; refresh gagal hanya memberi peringatan/retry refresh | 3 |
| F4 | WA manual memakai total sebelum membership; warning WA tertimpa pesan membership | Nota dari respons transaksi kanonis; subtotal, potongan, tagihan, metode/status pembayaran jelas; status WA ditampilkan terpisah | 3 |
| F5 | Error layanan/grafik dianggap data kosong | Loading, empty, error, retry dipisahkan; panel sukses tetap dapat dipakai ketika panel lain gagal | 4–5 |
| F6 | URL dashboard tetap dirender tanpa izin; tautan reports muncul tanpa izin | Gate sebelum fetch; layar akses ditolak; tautan sesuai izin; respons 403 juga ditangani bila izin berubah | 6 |
| F7 | Filter tujuh hari mencakup delapan hari | Hari ini ditambah enam hari sebelumnya, per kalender WIB | 7 |
| F8 | Pesanan hari ini mengikuti timezone server | Batas hari WIB identik pada server UTC/Jakarta; tampilan waktu juga WIB | 8 |

### Kontrak perilaku

1. **Nama:** trim input; kosong atau hanya spasi ditolak. `requireCustomerName` tetap dipertahankan sebagai field kompatibilitas dengan nilai efektif `true`. GET settings full/public mengembalikan `true` walaupun database lama `false`; update settings menyimpan `true`. PUT yang secara eksplisit mengirim `false` mendapat validation error 400 dengan pesan nama selalu wajib. UI baru selalu mengirim `true`.
2. **Preview:** baris form boleh tetap terpisah, tetapi perhitungan menggabungkan qty per service. Saldo 10, qty 6+6, rate 1, harga Rp8.000 menghasilkan subtotal Rp96.000, cover Rp80.000, payable Rp16.000. Missing template/item tidak boleh dianggap rate 1 secara diam-diam. Jangan memutasi saldo pelanggan.
3. **Identitas pelanggan:** preview membership hanya dipakai untuk identitas yang backend juga bisa kaitkan. Pada alur saat ini backend mencari customer melalui nomor telepon; pencocokan nama saja tanpa nomor tidak boleh menjanjikan coverage membership pelanggan lama. Resolusi pelanggan tanpa nomor bukan perluasan scope ini.
4. **Penyimpanan:** sesudah POST 201, simpan respons server, reset form sekali, tampilkan ID transaksi. Kegagalan pemuatan customer berikutnya tidak mengubah status tersimpan dan tidak memicu POST ulang. Konflik kuota 409 mempertahankan form, memuat ulang pelanggan, dan meminta konfirmasi ulang.
5. **Pembayaran:** `payableAmount` adalah tagihan setelah membership. Untuk `BAYAR_NANTI`, tulis “Belum dibayar”; jangan mengaku “dibayar” hanya karena transaksi tersimpan. Nominal nol tetap sah ketika membership menutup seluruh tagihan.
6. **WhatsApp:** outcome `sent`, `queued`, `skipped`, dan `failed` berbeda. Queued tidak berarti pesan telah terkirim. Membership dan refresh pelanggan tidak boleh menimpa status WA. Manual send hanya tersedia bila nomor ada; pesan memakai transaksi yang sudah disimpan, bukan form yang sudah kosong.
7. **Pemuatan:** services, customers, settings, stats, trend, top services memiliki outcome yang dapat dibedakan. Jika data customer gagal dimuat, blok submit untuk mencegah preview membership yang tidak dapat dipercaya; tombol retry memuat ulang data tanpa menghapus input. Jika tidak ada layanan pada respons sukses, tampilkan empty state yang berbeda dari error.
8. **Permission:** OWNER lolos; CASHIER/TRACKING/PROFILE selalu tersedia untuk STAFF. DASHBOARD dan REPORTS memakai flag masing-masing. Saat settings belum terkonfirmasi, jangan fetch dashboard. Settings error bukan denial: tampilkan retry. JSON permission malformed memakai akses minimum, bukan semua menu.
9. **Tanggal:** default dan custom memakai hari WIB. Tujuh hari mencakup enam hari sebelum hari ini sampai akhir hari ini. Periode lintas bulan/tahun dan Februari kabisat valid. Custom parsial/terbalik ditampilkan sebagai validasi, bukan query seluruh waktu. Tren minimum tujuh hari tetap dipertahankan saat filter satu hari.

### Pendekatan yang dipilih

Perbaikan bertahap pada komponen yang ada dengan beberapa helper murni dan test regresi. Patch langsung tanpa helper lebih cepat tetapi mudah membuat preview/nota/tanggal berbeda lagi. Refactor besar halaman kasir atau mengganti state management memberi risiko lebih tinggi dan tidak diperlukan untuk delapan temuan ini.

## Review Focus

| Kondisi yang mudah terlewat | Harapan | Test pemilik |
|---|---|---|
| Layanan duplikat, qty pecahan, rate selain 1, template hilang | Coverage tidak melewati saldo; rounding sama dengan server | Task 2 |
| POST 201 lalu refresh 500; WA queued/failed; membership payable nol | Tetap tersimpan, tidak POST ulang, nominal/status nota benar | Task 3 |
| Settings/customer loading lambat atau gagal; izin dicabut setelah halaman terbuka | Input terjaga; retry tersedia; akses aman; respons lama diabaikan | Task 4–6 |
| Browser UTC/Los Angeles dan server UTC/Jakarta di sekitar tengah malam WIB | Periode tujuh hari serta todayOrders identik | Task 7–8 |
| Data lama `requireCustomerName=false`, nama spasi, customer tanpa nomor | Nama selalu terlihat; spasi ditolak; tidak memberikan preview membership palsu | Task 1–2 |

## Struktur file dan urutan

| Bagian | File utama | Tanggung jawab |
|---|---|---|
| Kebijakan nama | `Cashier.jsx`, `CashierFormSection.jsx`, `useSettings.js`, `settingController.js`, setting/transaction schemas | Field wajib dan kompatibilitas settings lama |
| Preview | `frontend/src/utils/cashierPreview.js` | Gabungkan layanan dan hitung preview |
| Nota | `frontend/src/utils/cashierReceipt.js` | Pesan dari respons server, bukan draft form |
| Load state | `Cashier.jsx`, `AppContext.jsx` | Kegagalan awal dan retry |
| Dashboard | `Dashboard.jsx` | Error per panel dan akses laporan |
| Permission | `frontend/src/utils/staffAccess.js`, `components/StaffMenuGate.jsx`, `App.jsx`, `MainLayout.jsx` | Akses menu konsisten |
| Kalender frontend | `frontend/src/utils/dateRange.js`, `DateFilter.jsx`, `Dashboard.jsx`, `Reports.jsx` | Rentang dan validasi WIB |
| Kalender backend | `backend/src/utils/businessDate.js`, `dashboardController.js` | Batas todayOrders tetap WIB |
| Test | Jest backend; `frontend/scripts/*.test.mjs`; Playwright mock dan real STAFF | Bukti per temuan dan regresi role |

Urutan: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9**. Task 3 memakai helper Task 2; Task 6 memakai outcome settings Task 4; Task 8 mengikuti kontrak tanggal Task 7. Perubahan tetap dikerjakan berurutan karena beberapa task menyentuh `Cashier.jsx` dan `Dashboard.jsx` yang sama.

---

## Task 1: Nama pelanggan selalu wajib

**Files:**
- Modify: `frontend/src/pages/Cashier.jsx` — bagian input pelanggan dan payload.
- Modify: `frontend/src/pages/settings/sections/CashierFormSection.jsx` — hapus toggle nama, tampilkan informasi “Nama pelanggan selalu wajib”.
- Modify: `frontend/src/pages/settings/hooks/useSettings.js` — normalisasi settings yang dimuat dan payload save menjadi `requireCustomerName: true`.
- Modify: `backend/src/controllers/settingController.js` — full/public GET dan update.
- Modify: `backend/src/schemas/settingSchema.js`, `backend/src/schemas/transactionSchema.js`.
- Test: `backend/tests/unit/settingController.test.js`; Create `backend/tests/unit/transactionNamePolicy.test.js`.
- Browser test: `e2e/mocked/staff-cashier-regression.spec.js` — test nama dari settings lama.

**Interfaces:** Tetap memakai `customerName: string` dan `requireCustomerName: true`. Tidak menghapus kolom Prisma. GET full/public selalu mengembalikan nilai efektif true.

- [x] **1. Tambah test schema sebelum patch.**

```js
const { createTransactionSchema } = require('../../src/schemas/transactionSchema');
const { updateSettingSchema } = require('../../src/schemas/settingSchema');
const payload = { customerName: '   ', items: [{ serviceId: 'svc-1', qty: 1 }] };
test('rejects whitespace-only names', () => {
  expect(createTransactionSchema.safeParse(payload).success).toBe(false);
});
test('does not allow disabling the customer name', () => {
  expect(updateSettingSchema.safeParse({ requireCustomerName: false }).success).toBe(false);
});
test('trims a valid name', () => {
  expect(createTransactionSchema.parse({ ...payload, customerName: ' Budi ' }).customerName).toBe('Budi');
});
```

Tambahkan di test settings: record lama `requireCustomerName:false` menghasilkan full/public response true; update tanpa field nama menulis true. Mock Prisma memakai struktur suite yang sudah ada.

- [x] **2. Jalankan test dan pastikan kasus baru gagal.** `npm test --workspace=backend -- transactionNamePolicy settingController`.
- [x] **3. Terapkan kebijakan secara konsisten.**

```js
// transactionSchema.js
customerName: z.string().trim().min(1, 'Nama pelanggan wajib diisi'),
// settingSchema.js
requireCustomerName: z.literal(true, { error: 'Nama pelanggan selalu wajib diisi' }).optional(),
// settingController.js: letakkan setelah ...setting pada respons full
requireCustomerName: true,
// settingData pada update
requireCustomerName: true,
```

Hapus conditional render `settings?.requireCustomerName !== false` di kasir. Input tetap `required`; beri `id="cashier-customer-name"` dan label `htmlFor` agar test/accessibility tidak bergantung placeholder. Form `onSubmit` memeriksa hasil trim sebelum POST. Hook settings menempatkan `requireCustomerName:true` setelah spread data/payload agar nilai lama tidak menimpanya.

- [x] **4. Verifikasi:** schema/settings tests lulus; browser fixture settings false tetap menampilkan field required; tanpa nama tidak ada POST; owner tidak melihat toggle; toggle nomor/alamat tetap bekerja.
- [x] **5. Commit terfokus saat eksekusi sudah diizinkan:** `fix(cashier): require customer name consistently`.

## Task 2: Preview membership konsisten dengan layanan gabungan

**Files:**
- Create: `frontend/src/utils/cashierPreview.js`.
- Create: `frontend/scripts/cashierPreview.test.mjs`.
- Modify: `frontend/src/pages/Cashier.jsx`.
- Modify: `frontend/package.json` — `test:unit: node --test scripts/*.test.mjs`.
- Test: `backend/tests/unit/queryOptimization.test.js` — nominal transaksi layanan duplikat.

**Interfaces:**
- `calculateCashierPreview(selectedItems, membership, packages)` menerima `[{service, qty}]`, membership dari endpoint customers atau null, dan array package dari settings.
- Menghasilkan `{ totalPrice, coveredAmount, payableAmount, items }`; setiap item memiliki `{ serviceId, serviceName, unit, qty, lineTotal, coveredAmount, payableAmount, consumedQuota }`.
- Fungsi murni, tidak memutasi input. Backend `calculateCoverage` dan penggabungan `mergedByService` tetap menjadi acuan.

- [x] **1. Tambah test regresi nominal, bukan hanya detail internal.**

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateCashierPreview } from '../src/utils/cashierPreview.js';
const service = { id: 's1', name: 'Cuci', unit: 'kg', price: 8000 };
const membership = { isActive: true, templateId: 'p1', balances: [{ serviceId: 's1', remainingQty: 10 }] };
const packages = [{ id: 'p1', items: [{ serviceId: 's1', deductionRate: 1 }] }];
test('duplicate rows share one membership quota', () => {
  const before = structuredClone(membership);
  const out = calculateCashierPreview([{ service, qty: 6 }, { service, qty: 6 }], membership, packages);
  assert.equal(out.totalPrice, 96000);
  assert.equal(out.coveredAmount, 80000);
  assert.equal(out.payableAmount, 16000);
  assert.deepEqual(membership, before);
});
test('a missing package never defaults to full coverage', () => {
  assert.equal(calculateCashierPreview([{ service, qty: 6 }], membership, []).payableAmount, 48000);
});
```

Tambahkan test rate 2/kuota 10/qty 6 → used 10, cover Rp40.000, bayar Rp8.000; qty pecahan; dua service memakai saldo masing-masing; membership inactive; saldo nol; total penuh ditutup membership. Tambahkan test backend duplicate 6+6 dengan saldo 10 menghasilkan angka yang sama melalui `createTransaction`, memakai fixture `tx` suite queryOptimization.

- [x] **2. Run red:** `node --test frontend/scripts/cashierPreview.test.mjs`; `npm test --workspace=backend -- queryOptimization`.
- [x] **3. Implementasi perhitungan:** deduplicate serviceId dengan Map, jumlahkan qty, baru hitung satu kali per service.

```js
const grouped = new Map();
for (const { service, qty } of selectedItems) {
  if (!Number.isFinite(qty) || qty <= 0) continue;
  const previous = grouped.get(service.id);
  grouped.set(service.id, { service, qty: (previous?.qty || 0) + qty });
}
// Untuk setiap service gabungan:
const lineTotal = Math.round(qty * service.price);
const template = packages.find(p => p.id === membership?.templateId);
const quotaItem = template?.items?.find(i => i.serviceId === service.id);
const balance = membership?.balances?.find(b => b.serviceId === service.id);
const rate = quotaItem?.deductionRate == null ? 1 : Number(quotaItem.deductionRate);
const allowed = membership?.isActive && quotaItem && balance && Number.isFinite(rate) && rate > 0;
const required = qty * rate;
const consumedQuota = allowed ? Math.min(required, Math.max(0, Number(balance.remainingQty) || 0)) : 0;
const coveredAmount = allowed ? Math.min(lineTotal, Math.round(qty * service.price * consumedQuota / required)) : 0;
const payableAmount = lineTotal - coveredAmount;
```

Gunakan helper untuk subtotal dan preview UI. Hapus efek perhitungan coverage lama; tampilkan “Subtotal”, “Potongan membership”, “Tagihan setelah membership”. Gunakan matchedCustomer melalui phone yang sama dengan backend; saat phone kosong jangan memakai kecocokan nama untuk memberikan preview membership. Form masih mengirim serviceId/qty, nominal backend tetap tidak dipercaya dari klien.

- [x] **4. Run green dan browser:** test helper + test backend; input dua baris 6kg, bandingkan preview dan respons kanonis. Uji ulang qty pecahan dan payable nol.
- [x] **5. Commit:** `fix(cashier): align membership preview with merged services`.

## Task 3: Pisahkan transaksi tersimpan, refresh pelanggan, dan status WhatsApp

**Files:**
- Modify: `frontend/src/pages/Cashier.jsx` — `handleSubmit`, feedback, `lastTransaction`, `openWhatsApp`.
- Create: `frontend/src/utils/cashierReceipt.js`.
- Create: `frontend/scripts/cashierReceipt.test.mjs`.
- Browser test: `e2e/mocked/staff-cashier-regression.spec.js`.

**Interfaces:**
- `buildCashierReceipt(transaction, businessName): string` memakai `id`, `lineItems`, `totalPrice`, `coveredAmount`, `payableAmount`, `paymentMethod`, `estimatedCompletionAt`, `customerName` dari respons server.
- State `savedTransaction` menyimpan respons kanonis; `saveError`, `refreshError`, dan `whatsappOutcome` tidak menimpa satu sama lain.
- `classifyWhatsAppOutcome(result)` menghasilkan `'sent'|'queued'|'skipped'|'failed'`; exported dari `cashierReceipt.js` untuk unit test.

- [x] **1. Test angka nota dan browser status simpan.**

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCashierReceipt, classifyWhatsAppOutcome } from '../src/utils/cashierReceipt.js';
test('receipt uses saved membership amounts, including zero payable', () => {
  const text = buildCashierReceipt({ id: 'tx-1', customerName: 'Budi', totalPrice: 48000,
    coveredAmount: 48000, payableAmount: 0, paymentMethod: 'CASH', lineItems: [] }, 'Laundry');
  assert.match(text, /Subtotal.*48\.000/);
  assert.match(text, /Membership.*48\.000/);
  assert.match(text, /Tagihan.*Rp 0/);
});
test('queued is not delivered even when an error is present', () => {
  assert.equal(classifyWhatsAppOutcome({ ok: false, queued: true, error: 'Gateway offline' }), 'queued');
});
```

Browser fixture: POST returns 201/tx-1; berikutnya GET customers 500. Assert “Transaksi tersimpan”, ID tx-1, peringatan refresh terpisah, form reset, jumlah POST tepat 1. Klik retry pelanggan: jumlah POST tetap 1. Test membership+WA failed, membership+WA queued, BAYAR_NANTI, phone kosong, konflik 409 (form tidak reset), double click saat pending (satu POST).

- [x] **2. Run red:** `node --test frontend/scripts/cashierReceipt.test.mjs`; mock Playwright test “saved transaction survives customer refresh failure”.
- [x] **3. Refactor alur submit terbatas:** tangani hanya POST pada blok error penyimpanan, lalu efek lanjutan terpisah.

```js
let transaction;
try {
  transaction = (await api.post('/transactions', payload)).data;
} catch (err) {
  // 409: pertahankan draft; reload customer; minta konfirmasi ulang.
  // Kegagalan POST lain: tampilkan pesan server tanpa mengklaim sudah tersimpan.
  setSaveError(err.response?.data?.message || err.response?.data?.error || 'Status penyimpanan belum terkonfirmasi. Periksa Tracking sebelum mengulang.');
  setLoading(false);
  return;
}
setSavedTransaction(transaction);
setWhatsappOutcome(classifyWhatsAppOutcome(transaction.whatsapp));
setFormData({ customerName: '', customerPhone: '', customerAddress: '', items: [{ serviceId: '', qty: '' }], paymentMethod: 'CASH' });
try {
  const response = await api.get('/customers', { params: { limit: 100 } });
  setCustomers(response.data.data || []);
  setRefreshError('');
} catch {
  setRefreshError('Transaksi tersimpan, tetapi data pelanggan belum diperbarui.');
}
setLoading(false);
```

Implementasikan cabang 409 secara eksplisit sebelum setSaveError generik: reload customer tanpa reset, bila reload gagal tampilkan “Kuota berubah; pemuatan ulang gagal” dan blok konfirmasi berikutnya sampai retry berhasil. Tambahkan guard request pending; jangan auto-retry POST pada error jaringan. Tombol retry customer hanya GET. Pesan simpan tampil selalu setelah 201; status WA dan potongan membership berupa informasi tambahan.

`classifyWhatsAppOutcome`: queued dahulu, lalu ok/sent, lalu skipped, sisanya failed. Manual receipt menyebut subtotal, potongan membership, tagihan setelah membership, dan “Belum dibayar” untuk BAYAR_NANTI. `payableAmount ?? totalPrice`, bukan `payableAmount || totalPrice`, untuk menjaga nol. Gunakan `estimatedCompletionAt` server dan format `timeZone:'Asia/Jakarta'`. Nama/nomor/layanan memakai saved transaction. Jangan mengirim WA saat test; intercept `window.open` dan periksa URL/message.

- [x] **4. Run green:** unit nota + mock browser; verifikasi status WA tidak tertimpa pesan membership dan payload WA full coverage tidak menyebut gross sebagai tagihan.
- [x] **5. Commit:** `fix(cashier): preserve saved outcome and canonical receipt amounts`.

## Task 4: Loading, error, dan retry pada kasir/settings

**Files:** `frontend/src/pages/Cashier.jsx`, `frontend/src/context/AppContext.jsx`; test mock browser.

**Interfaces:** AppContext menambah `settingsError: string` dan menggunakan `settingsLoading` yang sudah ada; `refreshSettings(): Promise<void>`. STAFF tetap memakai settings/public, OWNER full settings. Kasir mempunyai state loading/error services dan customers, terpisah dari status simpan.

- [x] **1. Browser test error layanan dan retry tanpa kehilangan form.**

```js
test('service fetch failure has a retry and preserves the customer name', async ({ page }) => {
  const fixture = await setupStaffPage(page, { serviceStatus: 500 });
  await page.goto('/cashier');
  await expect(page.getByRole('alert').filter({ hasText: 'Gagal memuat layanan' })).toBeVisible();
  await page.getByLabel('Nama Lengkap (Ketik untuk mencari)').fill('Budi');
  fixture.serviceStatus = 200;
  await page.getByRole('button', { name: 'Muat ulang layanan' }).click();
  await expect(page.locator('select').first().locator('option[value="svc-1"]')).toHaveCount(1);
  await expect(page.getByLabel('Nama Lengkap (Ketik untuk mencari)')).toHaveValue('Budi');
});
```

Tambahkan customer failure/settings failure, skeleton awal, response sukses services=[] (pesan empty), settings terlambat, request lama gagal setelah retry baru sukses, logout/unmount ketika request aktif. Submit disabled jika settings/services/customer belum terkonfirmasi. Error dan retry memakai `role="alert"` serta nama tombol yang spesifik.

- [x] **2. Run red:** mock Playwright test kasus load failure.
- [x] **3. Hilangkan catch yang mengubah kegagalan menjadi sukses dengan array kosong.**

```js
const results = await Promise.allSettled([
  api.get('/services'), api.get('/customers', { params: { limit: 100 } }),
]);
// Terima data hanya pada fulfilled; rejected menyimpan pesan error endpoint tersebut.
const canSubmit = !loading && !settingsLoading && !settingsError && settings &&
  !servicesLoading && !servicesError && !customersLoading && !customersError &&
  preview.totalPrice > 0;
```

Fetcher/retry mempertahankan form; stale results diabaikan memakai counter/ref atau cleanup yang sudah ada. AppContext membersihkan settings/error saat logout/perubahan tenant dan menolak respons user lama. `settings === null` dibedakan dari sukses settings kosong. Jika daftar layanan sukses kosong, arahkan owner ke layanan; staff diberi pesan meminta owner menyediakan layanan, bukan tautan yang tidak diizinkan.

- [x] **4. Run green:** mock tests, lint; pastikan retry tidak memanggil POST transactions.
- [x] **5. Commit:** `fix(cashier): expose data loading failures and safe retries`.

## Task 5: Error dashboard per panel

**Files:** `frontend/src/pages/Dashboard.jsx`; mock `e2e/mocked/staff-dashboard-regression.spec.js`.

**Interfaces:** Outcome stats/trend/topServices terpisah. Error message membaca `.message` lalu `.error`. Empty state hanya untuk respons sukses kosong. Retry panel hanya memuat endpoint panel tersebut; retry keseluruhan opsional menggunakan reloadKey yang sudah ada.

- [x] **1. Browser test chart 500 bukan empty state.**

```js
test('trend error remains distinct from no revenue', async ({ page }) => {
  const fixture = await setupStaffPage(page, { trendStatus: 500 });
  await page.goto('/dashboard');
  await expect(page.getByRole('alert').filter({ hasText: 'Gagal memuat tren pendapatan' })).toBeVisible();
  await expect(page.getByText('Belum ada pendapatan tercatat di periode ini', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Pendapatan (Lunas)', { exact: true })).toBeVisible();
  fixture.trendStatus = 200;
  await page.getByRole('button', { name: 'Muat ulang tren pendapatan' }).click();
  await expect(page.getByText('Belum ada pendapatan tercatat di periode ini', { exact: true })).toBeVisible();
});
```

Tambahkan top-services error, stats error dengan pesan dari field message, sukses kosong, perubahan filter cepat dengan request lama terlambat, retry satu panel tidak mengubah metrik panel lain.

- [x] **2. Run red:** mock Playwright test trend failure.
- [x] **3. Simpan outcome tiap endpoint.**

```js
const apiMessage = (err, fallback) => err.response?.data?.message || err.response?.data?.error || fallback;
// Pada hasil Promise.allSettled:
setTrendError(trendRes.status === 'rejected' ? apiMessage(trendRes.reason, 'Gagal memuat tren pendapatan.') : '');
setTopServicesError(topRes.status === 'rejected' ? apiMessage(topRes.reason, 'Gagal memuat layanan terlaris.') : '');
```

Render urutan loading → error+retry → sukses kosong → konten. Bila stats gagal tanpa data, jangan render angka nol sebagai angka aktual; pakai unavailable state. Bila mempertahankan data sukses lama saat refresh gagal, labeli data sebelumnya dan periode asalnya; jangan mencampur data lama dengan label filter baru. Pertahankan cleanup `cancelled`/request ID untuk perubahan filter dan retry.

- [x] **4. Run green:** mock tests; uji viewport 390×844 dan 1440×1000, keyboard retry, tidak ada pageerror.
- [x] **5. Commit:** `fix(dashboard): separate panel failures from empty data`.

## Task 6: Permission dashboard dan reports konsisten

**Files:**
- Create `frontend/src/utils/staffAccess.js`, `frontend/scripts/staffAccess.test.mjs`, `frontend/src/components/StaffMenuGate.jsx`.
- Modify `frontend/src/App.jsx`, `frontend/src/layouts/MainLayout.jsx`, `frontend/src/pages/Dashboard.jsx`.
- Test `backend/tests/unit/staffPermission.test.js`, mock dashboard role tests.

**Interfaces:** `canAccessStaffMenu(user, settings, menu): boolean`; OWNER true, STAFF minimum CASHIER/TRACKING/PROFILE, optional DASHBOARD/REPORTS/CUSTOMERS/SERVICES sesuai JSON array settings.staffAllowedMenus. Invalid JSON/type false untuk optional. `StaffMenuGate({menu, children})` menggunakan AppContext loading/error serta AuthContext user.

- [x] **1. Unit permission dan browser test URL langsung.**

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAccessStaffMenu } from '../src/utils/staffAccess.js';
test('malformed settings do not grant optional staff menus', () => {
  const staff = { role: 'STAFF' };
  assert.equal(canAccessStaffMenu(staff, { staffAllowedMenus: '{broken' }, 'DASHBOARD'), false);
  assert.equal(canAccessStaffMenu(staff, { staffAllowedMenus: '{}' }, 'REPORTS'), false);
  assert.equal(canAccessStaffMenu(staff, null, 'CASHIER'), true);
});
```

Browser: STAFF tanpa DASHBOARD membuka URL langsung → “Akses dashboard tidak diizinkan”, tombol kembali kasir, tidak ada GET dashboard. DASHBOARD boleh/REPORTS tidak boleh → dashboard normal, tidak ada href reports pada kedua CTA. Settings 500 → retry settings, bukan denial. Setelah izin dicabut server merespons 403 → access state, tidak render metrik nol atau retry data tanpa izin. OWNER tetap lolos. Backend test DASHBOARD false/true, bukan hanya REPORTS yang saat ini tercakup.

- [x] **2. Run red:** helper permission dan mock role tests.
- [x] **3. Terapkan helper yang sama pada sidebar, route gate, dan CTA.**

```jsx
<Route path="/dashboard" element={<StaffMenuGate menu="DASHBOARD"><Dashboard /></StaffMenuGate>} />
<Route path="/reports" element={<StaffMenuGate menu="REPORTS"><Reports /></StaffMenuGate>} />
// Dashboard: kedua CTA /reports hanya dirender bila helper mengizinkan REPORTS.
```

Gate menunggu settings untuk optional STAFF menu; error settings menampilkan retry; denial menampilkan informasi akses, bukan skeleton abadi. Pada backend 403/code STAFF_PERMISSION_DENIED sesudah gate lolos, Dashboard menampilkan access-denied state dan memuat ulang settings tanpa mengulang fetch berputar. Jangan mengubah semua 403 menjadi logout/paywall. Middleware backend DASHBOARD tidak dilemahkan.

- [x] **4. Run green:** unit permission, Jest permission, mock matrix (owner; staff diizinkan; staff dashboard ditolak; staff reports ditolak; malformed settings).
- [x] **5. Commit:** `fix(staff): enforce dashboard access in routes and navigation`.

## Task 7: Rentang tujuh hari dan tanggal frontend tetap WIB

**Files:** `frontend/src/utils/dateRange.js`, Create `frontend/scripts/dateRange.test.mjs`, Modify `Dashboard.jsx`, `Reports.jsx`, `DateFilter.jsx`.

**Interfaces:**
- `getDateRange(filter, customDate, now = new Date())` mempertahankan hasil `{startDate, endDate}` ISO UTC; now tambahan opsional untuk test.
- `validateCustomDate(customDate): string` mengembalikan pesan atau string kosong; custom lengkap/valid wajib sebelum getDateRange('kustom').
- `getTrendRange({startDate,endDate}): {startDate,endDate}` minimum tujuh hari WIB; menggantikan helper lokal Dashboard.
- Export `BUSINESS_TZ_OFFSET = 420` untuk request revenue trend.

- [x] **1. Unit test boundary tetap, bukan bergantung jam test.**

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDateRange } from '../src/utils/dateRange.js';
test('seven days include today plus six preceding WIB days', () => {
  assert.deepEqual(getDateRange('7_hari', {}, new Date('2026-10-10T17:30:00Z')), {
    startDate: '2026-10-04T17:00:00.000Z', endDate: '2026-10-11T16:59:59.999Z',
  });
});
test('custom dates represent WIB rather than host local time', () => {
  assert.deepEqual(getDateRange('kustom', { start: '2026-02-28', end: '2026-03-01' }), {
    startDate: '2026-02-27T17:00:00.000Z', endDate: '2026-03-01T16:59:59.999Z',
  });
});
```

Tambahkan hari ini/kemarin/bulan ini, 31 Des → 1 Jan, 29 Feb 2028, custom parsial/terbalik/tanggal tak valid, tren minimum tujuh hari. Jalankan test dengan TZ=UTC, Asia/Jakarta, America/Los_Angeles; hasil harus identik.

- [x] **2. Run red:** `env TZ=UTC node --test frontend/scripts/dateRange.test.mjs`.
- [x] **3. Implementasi memakai UTC getters dan offset tetap; jangan gunakan setHours lokal.**

```js
export const BUSINESS_TZ_OFFSET = 420;
const DAY_MS = 86400000;
const shift = BUSINESS_TZ_OFFSET * 60000;
const wib = new Date(now.getTime() + shift);
const todayStart = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - shift;
// hari_ini: [todayStart, todayStart + DAY_MS - 1]
// kemarin: [todayStart - DAY_MS, todayStart - 1]
// 7_hari: [todayStart - 6 * DAY_MS, todayStart + DAY_MS - 1]
// bulan_ini: [Date.UTC(year, month, 1) - shift, todayStart + DAY_MS - 1]
// kustom: parse komponen YYYY-MM-DD, cek round-trip tanggal, lalu Date.UTC(...) - shift.
```

Custom incomplete/invalid jangan disulap ke hari ini atau seluruh waktu. Validasi sebelum destructuring pada fetch Dashboard/Reports dan pada export PDF/Excel Reports. DateFilter menampilkan error tanggal dan label input start/end; export disabled pada range invalid. Dashboard mengirim tzOffset=420 dan memakai helper trend baru. Label timestamp/dashboard memakai timeZone Asia/Jakarta; jangan menambahkan teks WIB pada hasil format timezone browser.

- [x] **4. Run green ketiga timezone; browser capture query hari ini/tujuh hari/custom; smoke Reports fetch dan export boundary tanpa mengubah format ekspor.**
- [x] **5. Commit:** `fix(dashboard): use seven-day WIB date ranges consistently`.

## Task 8: todayOrders memakai batas hari WIB pada server

**Files:** Create `backend/src/utils/businessDate.js`, Create `backend/tests/unit/businessDate.test.js`; Modify `backend/src/controllers/dashboardController.js`, `backend/tests/unit/dashboardController.test.js`.

**Interfaces:** `getWibDayBounds(now = new Date()): {start: Date,end: Date}`; eksport CommonJS. Endpoint stats dan response keys tetap sama. Date filter metrik mengikuti startDate/endDate request; todayOrders selalu hari ini WIB, tidak mengikuti custom periode.

- [x] **1. Test batas hari dan test query controller dengan frozen clock.**

```js
const { getWibDayBounds } = require('../../src/utils/businessDate');
test('WIB midnight is 17:00 UTC on the preceding date', () => {
  expect(getWibDayBounds(new Date('2026-10-10T17:30:00Z'))).toEqual({
    start: new Date('2026-10-10T17:00:00.000Z'),
    end: new Date('2026-10-11T16:59:59.999Z'),
  });
});
```

Di suite dashboard yang sudah memock Prisma: `jest.useFakeTimers().setSystemTime(new Date('2026-10-10T17:30:00Z'))`, panggil stats, assert findMany.where.startDate identik dengan helper dan businessId benar; afterEach `jest.useRealTimers()`. Tambahkan waktu 16:59:59.999Z/17:00Z, batas bulan/tahun. Test saat filter kemarin tetap menanyakan todayOrders hari ini.

- [x] **2. Run red:** `env TZ=UTC npm test --workspace=backend -- businessDate dashboardController`.
- [x] **3. Ganti startOfToday.setHours/endOfToday.setHours dengan helper.**

```js
const getWibDayBounds = (now = new Date()) => {
  const offsetMs = 420 * 60000;
  const local = new Date(now.getTime() + offsetMs);
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs);
  return { start, end: new Date(start.getTime() + 86400000 - 1) };
};
module.exports = { getWibDayBounds };
// controller
const { start: startOfToday, end: endOfToday } = getWibDayBounds(now);
```

Pertahankan take 20, urutan desc, dan seluruh tenant filters. Tidak mengandalkan ENV TZ untuk memperbaiki bisnis. Jangan memindahkan startDate transaksi yang sudah ada.

- [x] **4. Run green UTC/Jakarta; query fixture dengan transaksi 00:15 WIB masuk hari yang benar; test query-count/tenant isolation tetap lulus.**
- [x] **5. Commit:** `fix(dashboard): calculate today orders in WIB on every server`.

## Task 9: Jadikan seluruh regresi bagian dari CI dan E2E STAFF

**Files:**
- Create `e2e/mocked/staffFixture.js`, `e2e/mocked/staff-cashier-regression.spec.js`, `e2e/mocked/staff-dashboard-regression.spec.js`, `playwright.mock.config.js`.
- Create `e2e/staff-dashboard.spec.js`; Modify `e2e/dashboard.spec.js`, `playwright.config.js`.
- Modify `.github/workflows/ci.yml`, `frontend/package.json`, `README.md`.

**Interfaces:**
- `setupStaffPage(page, options = {})` dari fixture di bawah mengembalikan mutable scenario dan counters. Respons deterministik; semua API dimock pada suite mock, tanpa database/gateway.
- Project real `staff` menggunakan `e2e/.auth/staff.json`, sudah dibuat oleh auth.setup.js; testMatch `/staff-dashboard\.spec\.js/` dan dependencies `['setup']`.
- Mock suite memakai config terpisah, frontend saja, tanpa auth setup dan tanpa storageState owner.

- [x] **1. Buat fixture dan config mock sejak task pertama membutuhkan browser test.** Ini scaffolding test, bukan task produk terpisah. Gunakan sample Appendix A, tambahkan handlers task tanpa menghilangkan default endpoint.

```js
// playwright.mock.config.js
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e/mocked', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', browserName: 'chromium' },
  webServer: {
    command: 'npm run dev --workspace=frontend -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174', reuseExistingServer: !process.env.CI,
    env: { VITE_API_URL: 'http://127.0.0.1:5174/api' },
  },
});
```

- [x] **2. Koreksi E2E dashboard lama.** Assertion sekarang memakai “Pendapatan (Lunas)”, “Pelanggan Baru”, “Metode Pembayaran”, “Status Pengerjaan”. Jangan menghapus assertion gagal tanpa menggantinya dengan perilaku aktual. Tambahkan real STAFF test login menuju kasir, permission dashboard sesuai settings fixture, preview → save → Tracking nominal server. Owner matrix tetap berjalan.
- [x] **3. Buat fixture backend real melalui database test/API owner yang sudah authenticated.** Simpan settings semula sebelum mengubah permission dan pulihkan pada finally/afterEach. Jangan menggantungkan test deny pada seed default yang memberi izin. Gunakan service dan customer khusus test serta cleanup tenant-scoped; tidak mengirim WhatsApp nyata.
- [x] **4. Tambahkan gate CI setelah build frontend.**

```yaml
- name: Frontend helper and SEO tests
  run: npm run test:unit --workspace=frontend
- name: Staff cashier and dashboard mocked regressions
  run: npx playwright test --config=playwright.mock.config.js
```

Mock Playwright dijalankan di job yang memasang Chromium (job e2e yang ada), bukan job frontend tanpa browser. Di job frontend, ganti step SEO lama dengan step helper+SEO sesudah build karena scripts/*.test.mjs mencakup test artefak SEO; jangan menjalankan test SEO dua kali. Pertahankan test:seo sebagai script kompatibilitas. Job real E2E menjalankan semua project termasuk staff baru.

- [x] **5. Jalankan gate akhir sekali sesudah semua perubahan terkait selesai.**

```bash
npm test --workspace=backend
env TZ=UTC npm test --workspace=backend -- businessDate dashboardController
env TZ=Asia/Jakarta npm test --workspace=backend -- businessDate dashboardController
npm run lint --workspace=frontend -- --max-warnings=0
npm run build --workspace=frontend
npm run test:unit --workspace=frontend
env TZ=UTC node --test frontend/scripts/dateRange.test.mjs
env TZ=America/Los_Angeles node --test frontend/scripts/dateRange.test.mjs
npx playwright test --config=playwright.mock.config.js
npx playwright test --project=owner --project=staff
```

Untuk real E2E, DATABASE_URL wajib database test terisolasi yang sudah dimigrasi dan di-seed. Jalankan unit/integration MySQL dengan flag yang sudah ada hanya di database tersebut. Browser lokal yang belum memiliki executable Playwright perlu instalasi Chromium saat eksekusi; laporkan blocker tanpa mengklaim test dijalankan. Periksa mobile 390×844, desktop 1440×1000, keyboard, tidak ada crash, form input terjaga setelah retry.

- [x] **6. Dokumentasikan bukti per F1–F8**, command, hasil, dan test yang belum bisa dijalankan. Jangan menyatakan real E2E lulus berdasarkan mock saja.
- [x] **7. Commit:** `test(staff): cover cashier and dashboard regression flows`.

## Appendix A: Fixture mock yang dapat dikembangkan oleh test pemilik

```js
// e2e/mocked/staffFixture.js
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
```

Setiap spec browser mengimpor `const { test, expect } = require('@playwright/test')` dan `const { setupStaffPage } = require('./staffFixture')`. Gunakan locator label/role. Untuk failure pesan spesifik gunakan fallback UI endpoint; backend field message boleh berisi pesan generik fixture. Test stale request menambah promise yang dapat dilepas pada handler endpoint yang diuji; jangan mengandalkan sleep tetap.

## Definition of Done

- [x] F1–F8 memiliki test regresi yang terbukti gagal sebelum patch dan lulus sesudahnya.
- [x] Nama pelanggan selalu required; settings lama false teratasi; toggle nama tidak ada.
- [x] Preview duplicate/rate/rounding cocok dengan server dan tidak memutasi saldo.
- [x] POST sukses tidak berubah menjadi gagal karena refresh/WA; retry tidak membuat transaksi baru.
- [x] Nota manual memakai nominal kanonis dan status BAYAR_NANTI benar; payable nol tetap nol.
- [x] Error pemuatan terlihat dengan retry; empty state hanya untuk respons sukses kosong.
- [x] Staff tanpa izin tidak fetch dashboard atau melihat CTA reports; server tetap menolak akses terlarang.
- [x] Rentang tujuh hari benar dan todayOrders memakai WIB terlepas timezone browser/server.
- [x] Lint/build/unit/SEO/mock E2E/real STAFF+OWNER E2E lulus atau keterbatasan dilaporkan secara spesifik.
- [x] Tidak ada dependency baru, perubahan skema, penghapusan data, atau perubahan permission data asli.

## Self-review plan

- Coverage: setiap F1–F8 dipetakan ke task dan test; F5 dipisah kasir/dashboard karena failure mode berbeda.
- Keputusan user terbaru: nama selalu wajib; tidak ada fallback pelanggan anonim.
- Kontrak helper, state, test runner, dan response keys dinyatakan eksplisit; semua helper baru punya pemilik.
- Review Focus diliput oleh Task 1–8; Task 9 memasukkan bukti ke CI.
- Scope: penutupan audit beserta regresi yang langsung terkait; pencarian pelanggan melewati 100 data, desain ulang total, pengubahan template WA otomatis milik user, dan distributed queue tidak termasuk.
- Risiko implementasi: perubahan shared dateRange juga menyentuh Reports; settings lama false harus dinormalisasi; mock E2E tidak menggantikan test dengan database/otorisasi nyata.


## Bukti implementasi

| Temuan | Bukti regresi | Hasil akhir |
|---|---|---|
| F1 | cashierPreview unit; duplicate-service mock; real STAFF POST → Tracking | 11 helper tests; preview cover Rp80.000/payable Rp16.000 cocok dengan POST 201 |
| F2 | transactionNamePolicy; legacy-settings browser | 6 backend cases; nama tetap required saat setting lama false |
| F3 | saved transaction + refresh500; retry; in-flight double-submit; quota409 | Status tersimpan terjaga; retry tidak mengulang POST; konflik mempertahankan draft |
| F4 | cashierReceipt; zero-payable/manual WA; queued/failed; BAYAR_NANTI | 7 helper cases; nominal server dan status pembayaran/WA terpisah |
| F5 | services/customers/settings500; trend/top500 scoped retry | Error berbeda dari empty state; input/panel sukses tetap terjaga |
| F6 | staffAccess; middleware; direct URL/malformed/revoked; real API403 | Permission DASHBOARD/REPORTS independen; route/sidebar/CTA selaras |
| F7 | dateRange; browser query and Reports exports UTC/Los Angeles | 5 helper cases per timezone; 4 browser cases; tujuh hari dan custom boundaries WIB |
| F8 | businessDate + frozen dashboard clock | 12 backend date/controller cases di UTC; 00:15 WIB masuk hari yang benar |

Command dan hasil verifikasi lokal:

- `env DATABASE_URL=<isolated-washpro_test> WASHPRO_QUERY_DB_TESTS=1 npm test --workspace=backend`: **116 passed**, termasuk 4 integrasi MySQL.
- `npm run lint --workspace=frontend -- --max-warnings=0`: **exit 0**.
- `npm run build --workspace=frontend`: **exit 0**, client/SSR/prerender tersedia.
- `npm run test:unit --workspace=frontend`: **31 passed**, helper dan SEO.
- `env TZ=<UTC|America/Los_Angeles|Asia/Jakarta> node --test frontend/scripts/dateRange.test.mjs`: **5 passed per timezone**.
- `env TZ=UTC npm test --workspace=backend -- businessDate dashboardController`: **12 passed**.
- `npm exec -- playwright test --config=playwright.mock.config.js`: **28 passed**.
- `env DATABASE_URL=<isolated-washpro_test> npm exec -- playwright test --project=owner --project=staff`: **35 passed** (3 setup + 28 owner + 4 staff), Chrome lokal.
- `git -c core.whitespace=cr-at-eol diff --check`: **exit 0**.

Tes database menggunakan container MySQL baru pada port3307, migration+seed, dan gateway WhatsApp nonaktif. Tidak ada perubahan schema/dependency; tidak ada tes menulis database bisnis asli. Pipeline CI sudah memuat gate ini; eksekusi GitHub Actions memerlukan push/PR dan belum dijalankan dari sesi lokal.


## Review akhir dan keputusan eksekusi

Review read-only baru memeriksa seluruh perubahan. Empat temuan Important dan satu selisih rounding Rp1 ditangani dalam satu pass dengan regresi RED→GREEN:

- Error stats kini mempertahankan tren/layanan terlaris yang berhasil; retry stats tidak fetch ulang panel lain.
- Staff REPORTS tanpa DASHBOARD memakai summary dari endpoint `/reports/charts` berizin REPORTS, bukan melonggarkan otorisasi dashboard. Summary memakai transaksi non-cancelled dan pendapatan CASH/QRIS.
- Tanggal tampilan laporan, periode PDF/Excel, nama file Excel, dan pengelompokan harian backend memakai WIB. Browser tests memeriksa isi file ekspor, bukan hanya query.
- Estimasi kasir memakai durasi jam dalam milliseconds dan format WIB, termasuk tanggal heading nota.
- Preview memakai ratio-first persis urutan backend untuk coverage pecahan.

Keputusan yang dibuat selama eksekusi:

| Keputusan | Alasan | Biaya/risiko jika keliru |
|---|---|---|
| Tetap di branch fitur dan workspace yang sudah aktif | User menyetujui plan di checkout bersama; status diperiksa sebelum edit | Edit paralel user dapat konflik |
| Gabungkan commit Task2–4 dan Task5–8 | Loader kasir dan rendering/tanggal dashboard saling berbagi perubahan | Cherry-pick kurang granular |
| Counter SQL integrasi memakai trimStart | Raw SELECT Prisma dimulai newline, sehingga test lama menghitung1 dari2 SELECT | Parser counter tetap hanya mengenali query berawal SELECT |
| Rounding Rp1 diperlakukan Important dan diperbaiki | Kesamaan nominal dengan backend adalah acceptance criterion F1 | Tambahan patch/test kecil |
| Lookup pelanggan di luar100 pertama tetap di luar scope | Dikecualikan secara eksplisit oleh plan | Preview kandidat di daftar besar dapat tetap terlewat |
| Logika nominal ekspor Reports lama tetap di luar scope nota kasir | Patch nominal berfokus pada receipt kasir yang disimpan | PDF row full coverage lama dapat masih fallback ke gross; membutuhkan audit akuntansi laporan terpisah |
| Redesign race/error-state Reports umum tetap di luar scope | Pre-existing; hanya dependency izin dan kalender bersama diubah | Respons/error laporan lama dapat tetap menampilkan data usang |

Tidak ada minor review yang ditunda: selisih rounding telah diperbaiki. Tiga area di luar scope di atas dicatat terpisah dari delapan temuan kasir/dashboard yang ditutup.

Hasil gate akhir sesudah perbaikan review: backend116/116, frontend helper+SEO31/31, mock28/28, realOWNER/STAFF35/35; lint/build/diff-check exit0. Tidak ada temuan Critical/Important yang tersisa dari review. Tidak ada re-review tambahan; fix dibuktikan dengan regresi dan suite sesuai workflow.
