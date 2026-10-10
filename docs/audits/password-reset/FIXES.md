# Perbaikan reset password

Implementasi 11 Oktober 2026, berdasarkan temuan pada [audit awal](README.md).

## Perilaku setelah perbaikan

- OWNER dan STAFF memakai `/forgot-password` dan `/reset-password` dengan endpoint `/api/auth/*`.
- SUPERADMIN mendapat tautan lupa password pada login, halaman `/superadmin/forgot-password` dan `/superadmin/reset-password`, serta endpoint `/api/superadmin/forgot-password`, `/verify-otp`, dan `/reset-password`.
- Hash OTP dan data akun superadmin disimpan terpisah dari tenant. Token dibatasi tujuan `password-reset`, jenis akun, ID akun, dan ID OTP. Token admin dan tenant saling ditolak, termasuk jika secret keduanya kebetulan sama.
- OTP berlaku 5 menit, maksimum 5 percobaan verifikasi. Setiap percobaan dicadangkan secara atomik sebelum membandingkan hash agar batas ini juga berlaku untuk permintaan bersamaan. Token setelah verifikasi berlaku 10 menit. Permintaan OTP baru membatalkan token dari OTP sebelumnya.
- Token diklaim dengan conditional update `usedAt: null` di dalam transaksi, sebelum mengganti password. Dua permintaan bersamaan menghasilkan tepat satu sukses; transaksi gagal mengembalikan klaim OTP.
- Reset menaikkan `sessionVersion` akun; semua refresh token tenant dicabut. Middleware superadmin juga memeriksa versi sesi dari database sehingga token login admin lama ditolak setelah reset.
- Reset STAFF menghapus `mustChangePassword`. Verifikasi email tetap terpisah. Halaman onboarding menampilkan konfirmasi password selesai tanpa meminta password baru lagi.
- Halaman pemulihan dapat dibuka langsung tanpa sesi. Kegagalan bootstrap/refresh sesi tidak mengalihkannya ke login.
- Tanpa SMTP, semua permintaan lupa password mengembalikan 503 `EMAIL_UNAVAILABLE` sebelum mencari akun atau membuat OTP. Email reset wajib dikirim melalui SMTP; fallback ke log tidak digunakan. Pengiriman yang gagal atau dilewati menghapus OTP yang baru dibuat dan menampilkan error, sehingga UI tetap berada di halaman permintaan.

## Mengaktifkan di deployment

1. Terapkan migrasi `20261011090000_add_superadmin_password_recovery` sebelum menjalankan backend baru. Migrasi menambahkan `SuperAdmin.session_version` dan tabel `SuperAdminPasswordResetOtp` beserta foreign key.
2. Regenerasi Prisma Client saat membangun backend. Dockerfile proyek sudah menjalankan langkah generate/migrate pada build/startup.
3. Isi konfigurasi SMTP valid di environment backend: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, dan `SMTP_FROM`. Docker Compose sudah meneruskan variabel ini. Restart backend setelah mengganti environment.

Untuk deployment tanpa Docker, dari root proyek:

```sh
npm exec --workspace=backend -- prisma migrate deploy
npm exec --workspace=backend -- prisma generate
```

Tidak ada deployment atau database aplikasi yang diubah selama pekerjaan ini. SMTP nyata belum dikonfigurasi atau diuji; kredensial layanan email tidak tersedia di workspace. Kode dan UI menampilkan kondisi tersebut sebagai kegagalan pengiriman, bukan sukses palsu.

Token reset tenant yang terbit sebelum perubahan format token harus diminta ulang. Sesi login superadmin lama tanpa `sessionVersion` dianggap versi 0; tetap valid sampai akun direset dan versinya naik.

## Pengujian

- Semua 16 migrasi berhasil diterapkan pada container MySQL 8 sementara.
- Seluruh backend dengan test database opt-in: **145/145 lolos**, termasuk konkurensi reset ketiga role, batas lima perbandingan OTP bersamaan, dan rollback klaim OTP dengan Prisma/MySQL asli. Hanya pengiriman email yang dimock pada test integrasi reset; test rollback menyisipkan kegagalan penyimpanan setelah klaim SQL asli.
- Seluruh suite browser mocked: **45/45 lolos**. Mencakup pemulihan ketiga role, endpoint portal yang tepat, pengiriman tidak tersedia, empat URL pemulihan langsung tanpa sesi, onboarding STAFF setelah reset, serta regresi dashboard/kasir dan superadmin. API pada test browser memakai mock; tidak mengirim email atau mengubah akun nyata.
- Unit test frontend: **31/31 lolos**. Lint dan build frontend lolos.
- Review independen menemukan celah batas percobaan OTP bersamaan; regression test terbukti gagal sebelum perbaikan dan lolos setelah reservasi atomik diterapkan. Review ulang tidak menemukan masalah yang menghalangi penyelesaian.

Perintah utama pengujian database lokal:

```sh
env DATABASE_URL=mysql://root:washpro-test@127.0.0.1:3307/washpro_test \
  WASHPRO_PASSWORD_RESET_DB_TESTS=1 WASHPRO_QUERY_DB_TESTS=1 \
  npm test --workspace=backend
npm exec -- playwright test --config=playwright.mock.config.js
npm run test:unit --workspace=frontend
npm run lint --workspace=frontend
npm run build --workspace=frontend
```

Test integrasi menolak database di luar localhost dengan nama `washpro_test` atau `washpro_ci`, dan membersihkan fixture miliknya. Password database pada contoh hanya untuk container pengujian sementara.
