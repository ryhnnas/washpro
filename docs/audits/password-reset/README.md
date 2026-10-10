# Audit reset password semua role

Tanggal: 11 Oktober 2026. Basis commit: `ad657fd`, dengan perubahan dashboard superadmin yang masih ada di working tree.

**Catatan:** dokumen ini merekam kondisi sebelum perbaikan. Tindak lanjut implementasi dan hasil pengujian terbaru ada di [FIXES.md](FIXES.md).

## Hasil per role

| Role | Status pemulihan mandiri | Bukti |
| --- | --- | --- |
| OWNER | Tersedia melalui OTP email | Login → `/forgot-password` → `/reset-password`; controller berhasil mengganti hash, menerima login password baru, menolak password lama, dan mencabut sesi lama dalam pengujian. |
| STAFF / kasir | Tersedia melalui alur yang sama | Pengujian controller yang sama dengan role STAFF berhasil. STAFF merupakan role kasir pada model `User`. |
| SUPERADMIN | Belum tersedia | Model `SuperAdmin` terpisah; controller reset hanya mencari `User`. Tidak ada endpoint pemulihan pada router superadmin atau tautan lupa password di halaman login superadmin. |

Respons sukses generik dari `/auth/forgot-password` untuk email SUPERADMIN **bukan** bukti dukungan: tidak ada OTP yang dibuat atau email yang dikirim jika email tersebut tidak ada di tabel `User`. Jika email yang sama ada di kedua model, alur ini hanya memulihkan akun `User`, bukan akun `SuperAdmin`.

## Temuan dan batasan

1. **Pemulihan SUPERADMIN belum diimplementasikan.** Sumber: `backend/prisma/schema.prisma:19`, `backend/src/routes/superAdminRoutes.js:44`, `backend/src/controllers/authController.js:376`, `frontend/src/pages/superadmin/SuperAdminLogin.jsx:41`.
2. **Pemakaian token sekali belum aman untuk permintaan bersamaan.** Pengecekan `usedAt` ada sebelum transaksi, sedangkan penandaan OTP digunakan berupa update tanpa kondisi `usedAt: null`. Simulasi terkontrol terhadap controller asli menghasilkan dua respons 200 untuk satu token, bahkan ketika transaksi diserialkan. Kedua permintaan harus memiliki token reset yang valid; ini bukan bypass OTP oleh pengguna tanpa token. Password dari transaksi terakhir menjadi password akhir. Sumber: `backend/src/controllers/authController.js:497–521`. Belum diuji terhadap MySQL nyata dalam audit ini. Perbaikan perlu mengklaim OTP secara atomik dalam transaksi sebelum mengganti password.
3. **STAFF yang masih wajib onboarding tetap wajib mengganti password setelah reset.** Reset tidak menghapus `mustChangePassword`; login baru tetap membawa flag `true`, dan `ProtectedRoute` mengarahkan ke `/staff-onboarding`. Verifikasi email juga tetap merupakan syarat terpisah. Ini tidak menghalangi penggantian password, tetapi membuat proses pemulihan mengharuskan langkah tambahan. Sumber: `backend/src/controllers/authController.js:509`, `frontend/src/App.jsx:47`.
4. **Pengiriman email nyata belum diverifikasi.** Environment lokal yang diperiksa tidak memiliki root `.env`, `SMTP_USER`, atau `SMTP_PASS`. Tanpa SMTP, layanan hanya menulis email ke log dan mengembalikan `{ skipped: true }`, sementara permintaan lupa password tetap memberikan respons sukses generik. Konfigurasi deployment produksi belum diperiksa. Sumber: `backend/src/services/emailService.js:5–12`.

## Pengujian

Ditambahkan `backend/tests/unit/passwordReset.test.js` dengan 14 kasus:

- OWNER dan STAFF: OTP → token → reset → login baru; password lama ditolak; access token lama ditolak; refresh token lama dicabut; pemakaian ulang token secara berurutan ditolak.
- Email akun superadmin terpisah tidak mendapat OTP melalui controller tenant.
- OTP kedaluwarsa ditolak, lima percobaan salah menghanguskan OTP, dan permintaan OTP baru membatalkan token reset sebelumnya.
- Token tidak valid, kedaluwarsa, atau salah tujuan ditolak tanpa mengubah password.
- Flag onboarding STAFF tetap aktif dan respons saat layanan email melaporkan pengiriman dilewati diperiksa.
- Schema endpoint menolak tiga variasi password lemah.

Hasil verifikasi:

```text
npm test --workspace=backend -- --runTestsByPath tests/unit/passwordReset.test.js
14 passed

npm test --workspace=backend
20 suites passed, 1 skipped
126 tests passed, 4 skipped
```

Empat test yang dilewati memerlukan database integrasi opt-in. Pengujian reset menjalankan controller, bcrypt, JWT, middleware sesi, dan schema asli; Prisma serta email memakai fixture/mocks. Tidak ada akun nyata yang diubah atau email yang dikirim. UI ditelusuri melalui kode, belum diuji melalui browser pada audit ini. Rate limiter tersedia pada router, tetapi tidak diuji karena environment test melewatinya.

### Reproduksi konkurensi

Reproduksi sementara dijalankan bersama 14 kasus di atas (15/15 lolos), kemudian dikeluarkan dari suite tetap agar perilaku bermasalah tidak menjadi kontrak yang harus dipertahankan. Untuk mengulang, sisipkan kasus berikut di dalam `describe` pada file test tersebut:

```js
it('audit: concurrent requests reuse one reset token', async () => {
  const resetToken = await requestToken();
  const readOtp = prisma.passwordResetOtp.findUnique.getMockImplementation();
  let reads = 0;
  let release;
  const bothRead = new Promise((resolve) => { release = resolve; });
  prisma.passwordResetOtp.findUnique.mockImplementation(async (query) => {
    const snapshot = await readOtp(query);
    if (++reads === 2) release();
    await bothRead;
    return snapshot;
  });
  let queue = Promise.resolve();
  prisma.$transaction.mockImplementation((callback) => {
    queue = queue.then(() => callback(prisma));
    return queue;
  });
  const results = await Promise.all([
    invoke(resetPassword, { resetToken, newPassword: NEW_PASSWORD }),
    invoke(resetPassword, { resetToken, newPassword: 'ConcurrentReset3!' }),
  ]);
  expect(results.map((result) => result.statusCode)).toEqual([200, 200]);
  expect(user.sessionVersion).toBe(2);
});
```

Audit ini tidak mengubah implementasi aplikasi dan belum memperbaiki temuan.
