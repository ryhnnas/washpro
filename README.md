# WashPro — SaaS Laundry POS

Aplikasi web POS (Point of Sale) untuk bisnis laundry berbasis SaaS multi-tenant. Setiap bisnis laundry mendapat workspace terisolasi dengan data, staf, dan pengaturan sendiri.

## Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| Backend | Node.js + Express.js 5 + Prisma ORM |
| Database | MySQL |
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Notifikasi | WhatsApp via GOWA (Go-WhatsApp-Web-MultiDevice) |
| Validasi | Zod (backend) |

## Fitur Utama

- **Kasir (POS)** — Transaksi multi-layanan, kiloan & satuan, membership quota
- **Tracking** — Pantau & update status pesanan real-time
- **CRM & Membership** — Data pelanggan + paket membership berbasis kuota
- **Laporan** — Analitik pendapatan, export PDF & Excel
- **WhatsApp Notifikasi** — Nota digital & update status otomatis ke pelanggan
- **Multi-staff** — Role OWNER & STAFF dengan permission granular
- **SaaS Subscription** — Trial 7 hari, paywall QRIS, approval manual oleh SuperAdmin

## Setup Development

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd washpro
npm run install-all
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
# Edit .env sesuai konfigurasi lokal Anda
```

Variabel wajib diisi:
- `DATABASE_URL` — koneksi MySQL
- `JWT_SECRET` — secret untuk token tenant
- `SUPERADMIN_JWT_SECRET` — secret untuk token SuperAdmin (harus berbeda)

### 3. Setup Database

```bash
cd backend
npx prisma migrate dev
npm run db:seed
```

### 4. Jalankan Development Server

```bash
# Dari root — jalankan backend + frontend sekaligus
npm run dev

# Atau terpisah:
npm run backend    # Backend di http://localhost:5000
npm run frontend   # Frontend di http://localhost:5173
```

## Akun Default (setelah seed)

| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | admin@washpro.com | adminwashpro123 |
| Owner | owner@washpro.local | owner12345 |
| Staff | staff@washpro.local | staff12345 |

> Password default hanya untuk development. Ganti sebelum deploy ke production.

## Struktur Project

```
washpro/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── controllers/     # Request handlers
│       ├── middleware/       # auth, checkSubscription, upload, dll
│       ├── routes/           # Express routers
│       ├── schemas/          # Zod validation schemas
│       └── services/         # Business logic (whatsapp, membership)
└── frontend/
    └── src/
        ├── components/       # Reusable UI components
        ├── context/          # AuthContext, AppContext
        ├── layouts/          # MainLayout
        ├── lib/              # axios instance
        ├── pages/            # Halaman aplikasi
        │   └── superadmin/   # SuperAdmin portal
        ├── services/         # authService
        └── utils/            # qrisHelper
```

## API Endpoints

| Prefix | Deskripsi |
|--------|-----------|
| `POST /api/auth/register` | Registrasi bisnis baru (trial 7 hari) |
| `POST /api/auth/login` | Login tenant |
| `GET /api/dashboard/stats` | Statistik dashboard (OWNER only) |
| `GET /api/transactions` | Daftar transaksi |
| `POST /api/transactions` | Buat transaksi baru |
| `GET /api/customers` | Daftar pelanggan |
| `GET /api/services` | Daftar layanan |
| `GET /api/settings` | Pengaturan bisnis (OWNER only) |
| `GET /api/subscriptions/status` | Status langganan |
| `POST /api/subscriptions/pay` | Upload bukti pembayaran |
| `POST /api/superadmin/login` | Login SuperAdmin |
| `GET /api/superadmin/payments` | Daftar pembayaran pending |
| `GET /api/health` | Health check |

## Deployment & CI

### Docker Compose

```bash
docker compose up --build
```

Layanan: frontend (Nginx SPA + proxy `/api`), backend (Express), MySQL.

### CI Pipeline (GitHub Actions)

Setiap push/PR menjalankan:

1. `prisma migrate deploy` + seed + unit/integration test (MySQL terisolasi)
2. Migration upgrade check (schema pre-hardening → hardening migrations)
3. Frontend lint (`--max-warnings=0`) + production build + tes artefak SEO
4. Playwright E2E (Chromium, `GOWA_ENABLED=false`, database test terpisah)

### Tes Optimasi Query

`npm test` menjalankan tes jumlah pemanggilan Prisma, isolasi tenant, middleware,
perhitungan dashboard, kuota membership, dan worker WhatsApp tanpa koneksi database.
Lookup layanan dan validasi paket dilakukan per batch; penulisan kuota dengan jumlah
pengurangan berbeda tetap dikelompokkan agar pemeriksaan saldo berlangsung atomik.

CI juga mengaktifkan empat tes integrasi MySQL 8 dengan `WASHPRO_QUERY_DB_TESTS=1`.
Tes ini memeriksa jumlah SQL SELECT, pencocokan nama tanpa membedakan kapital/aksen
sesuai collation schema, isolasi tenant, pengembalian kuota, dan rollback saat saldo
tidak cukup. Untuk menjalankannya lokal, gunakan MySQL terpisah yang sudah dimigrasi,
set `DATABASE_URL` ke database `washpro_test` pada `localhost` atau `127.0.0.1`, lalu:

```bash
WASHPRO_QUERY_DB_TESTS=1 npm test --workspace=backend
```

Tanpa flag tersebut, empat tes database dilewati. Fixture dibersihkan hanya untuk
tenant yang dibuat oleh tes. Guard overlap worker WhatsApp berlaku dalam satu proses
backend; deployment dengan beberapa worker masih memerlukan klaim antrean terdistribusi.

### Reset Database Lokal

```bash
cd backend
npx prisma migrate reset   # HAPUS semua data, jalankan ulang migration + seed
```

> **Peringatan:** Jangan jalankan E2E (`npm run test:e2e`) terhadap database development/production. Playwright memakai `DATABASE_URL` test eksplisit (`washpro_ci` di CI). Set `DATABASE_URL` ke database test terpisah sebelum menjalankan E2E lokal.

### Backup Database

```bash
mysqldump -u user -p washpro > backup_$(date +%Y%m%d).sql
```

### Deploy Production

1. Set environment production (`NODE_ENV=production`, secret JWT unik, `GOWA_*` sesuai kebutuhan)
2. `npx prisma migrate deploy` (bukan `migrate dev`)
3. Build & deploy via Docker Compose atau platform PaaS
4. Pastikan Nginx SPA memakai security headers (CSP, X-Frame-Options) — lihat `frontend/nginx.conf`

### SEO Landing Page

Domain canonical: `https://washpro.my.id/`. Judul, deskripsi, metadata berbagi,
dan structured data dikelola di `frontend/seo.mjs`.

```bash
npm run build
npm run test:seo --workspace=frontend
```

Build menghasilkan `frontend/dist/index.html` dengan konten landing page lengkap
sebelum JavaScript berjalan, `app.html` dengan `noindex` untuk halaman akun,
serta `robots.txt` dan `sitemap.xml`. Halaman akun tetap memakai autentikasi
aplikasi yang sama; `noindex` hanya mengatur pengindeksan mesin pencari.

Gunakan konfigurasi `frontend/nginx.conf` saat deploy: `/` menyajikan landing
page, route aplikasi menyajikan `app.html`, dan URL tidak dikenal mengembalikan
HTTP 404. Jika memakai hosting selain Nginx, terapkan aturan yang sama; fallback
semua URL ke `index.html` akan menyajikan salinan landing page di halaman akun.
`vite preview` hanya untuk memeriksa build frontend, bukan aturan HTTP Nginx.

Setelah deploy, verifikasi domain di Google Search Console dan kirim sitemap
`https://washpro.my.id/sitemap.xml`. Jalankan tes SEO setelah build pada CI atau
sebelum deploy untuk memeriksa artefak yang akan diterbitkan.

## Keamanan

- Auth tenant & SuperAdmin memakai cookie `httpOnly` + CSRF header
- `sessionVersion` di JWT — change/reset password merevoke semua session
- Staff permission enforced di backend (`403 STAFF_PERMISSION_DENIED`)
- `totalPrice` request deprecated — backend selalu menghitung harga dari database

## Environment Variables

Lihat `.env.example` untuk daftar lengkap dan penjelasan setiap variabel.
