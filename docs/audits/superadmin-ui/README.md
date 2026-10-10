# Superadmin UI refresh

Arah yang dipilih user: gelap, rapi, dan profesional. Perubahan terbatas pada dashboard dan navigasi portal yang ada; API, otorisasi, dan aksi bisnis tetap memakai service yang sama.

## Perubahan

- Palet graphite dengan aksen emas, angka tabular, hierarki teks dan spacing yang konsisten.
- Empat metrik utama, grafik pendapatan enam bulan dengan tooltip keyboard, dan panel prioritas pembayaran.
- Status seluruh toko tetap tersedia; daftar masa berlaku, toko tanpa transaksi, paket, dan WhatsApp dipadatkan tanpa menghilangkan data.
- Tombol tinjau selalu membuka pembayaran PENDING; refresh memiliki indikator loading dan waktu pembaruan.
- Sidebar desktop dan drawer mobile memakai menu yang sama. Native dialog menangani focus trap dan Escape; memilih menu menutup drawer.
- Skeleton, empty state, dan error/retry tetap tersedia. Refresh gagal mempertahankan statistik terakhir yang berhasil.
- Header filter toko/pembayaran/paket bisa membungkus pada mobile. Nominal besar pada viewport 320px dapat membungkus tanpa overflow.

## Screenshot

Screenshot memakai fixture **data uji**, bukan data bisnis produksi. Session superadmin dan respons API di-mock. Jam browser dipatok ke 12 Oktober 2026 untuk hasil visual yang konsisten.

- [Desktop awal](desktop-before.png)
- [Desktop hasil](desktop-after.png)
- [Mobile awal](mobile-before.png)
- [Mobile hasil](mobile-after.png)

Desktop 1440×1050; mobile 390×844. Screenshot hasil diperiksa langsung setelah render browser. Tidak ada library atau font baru.

## Verifikasi

Regresi ada di e2e/mocked/superadmin-design.spec.js: navigasi pembayaran, mobile tanpa overflow, focus trap/Escape, data kosong, initial error/retry, nominal besar di 320px, reset filter PENDING dari shortcut, serta refresh gagal dengan data yang dipertahankan.

Jalankan dari root:

    npm run lint --workspace=frontend -- --max-warnings=0
    npm run build --workspace=frontend
    npm run test:unit --workspace=frontend
    npm exec -- playwright test --config=playwright.mock.config.js

Screenshot dapat diperbarui dengan CAPTURE_AFTER=1 saat menjalankan spec superadmin. Capture ini tidak memerlukan koneksi database dan tidak menulis data bisnis.

Hasil akhir lokal: lint zero warnings dan build client/SSR/prerender exit0; helper+SEO31/31; seluruh mock browser36/36, termasuk8 skenario superadmin. Real E2E dengan database tidak dijalankan untuk perubahan visual ini.
