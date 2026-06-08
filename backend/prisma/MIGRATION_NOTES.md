# Catatan Migration WashPro

## Migration yang pernah rusak (dotenvx output)

Tiga file migration pernah berisi output CLI `dotenvx` alih-alih SQL murni:

| Folder | Masalah |
|--------|---------|
| `20260427012440_membership_quota_package` | Hanya berisi teks dotenvx |
| `20260427012548_membership_quota_package` | Hanya berisi teks dotenvx |
| `20260427012704_membership_quota_package` | Baris pertama berisi output dotenvx sebelum SQL |
| `20260427020656_add_service_estimate_and_overdue` | Hanya berisi teks dotenvx |

File-file ini sudah diperbaiki agar **fresh deploy** dari database kosong dapat menjalankan `prisma migrate deploy`.

## Penting: jangan edit migration yang sudah diterapkan

Prisma menyimpan checksum setiap migration di tabel `_prisma_migrations`. Jika migration di atas **sudah pernah dijalankan** di lingkungan bersama (staging/production), mengubah isi file migration akan menyebabkan:

```
The migration `...` was modified after it was applied.
```

### Jika migration BELUM pernah diterapkan

Gunakan file yang sudah diperbaiki, lalu:

```bash
cd backend
npx prisma migrate deploy
npm run db:seed   # opsional
```

### Jika migration SUDAH pernah diterapkan

**Jangan** mengubah ulang file migration yang tercatat di `_prisma_migrations`. Pilih salah satu:

1. **Schema sudah benar di DB** — biarkan file lama; dokumentasikan bahwa fresh clone perlu baseline/squash terpisah.
2. **Migration gagal di tengah jalan** — perbaiki schema manual atau buat migration baru (`prisma migrate dev`) yang menyesuaikan delta.
3. **Reconcile checksum** — hanya jika tim DevOps setuju, gunakan `prisma migrate resolve` setelah verifikasi manual (risiko tinggi).

## Verifikasi fresh database

```bash
# Buat database kosong, set DATABASE_URL di .env
cd backend
npx prisma migrate deploy
```

Jika semua migration sukses, fresh deploy siap digunakan.
