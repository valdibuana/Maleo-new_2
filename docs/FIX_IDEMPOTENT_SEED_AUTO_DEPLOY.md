# 🔧 Fix Report: Idempotent Seed & Auto-Seed on Deploy

**Tanggal:** 8 Juli 2026  
**Status:** ✅ Selesai — Pushed ke `main` (`bfdbfe9`)  
**Tipe:** Bug Fix + DevOps Improvement

---

## 📋 Ringkasan Masalah

Saat deploy ke VPS, seed database **tidak otomatis jalan** sehingga tabel `users` kosong dan semua percobaan login gagal dengan error **401 Unauthorized**.

Selain itu, script seed yang lama **berbahaya** — setiap kali dijalankan ulang, ia akan **me-reset password semua user** ke default (`password`), termasuk password yang sudah diubah manual oleh admin/guru/siswa.

### Root Cause

1. **Seed tidak dipanggil saat container start** — Dockerfile hanya menjalankan `prisma migrate deploy` lalu langsung `node dist/src/index.js`, tanpa memanggil `prisma db seed`
2. **Seed tidak idempotent** — Semua `user.upsert()` memiliki `update: { password: hashedPassword }` yang akan **selalu menimpa** password existing

---

## 🛠️ Perubahan yang Dilakukan

### File yang Diubah

| # | File | Perubahan |
|---|------|-----------|
| 1 | `api/prisma/seed.ts` | Kosongkan `update` block di 4 user upsert |
| 2 | `api/package.json` | Tambah `migrate deploy` + `db seed` di start script |
| 3 | `api/Dockerfile` | Sederhanakan CMD (hapus duplikasi migrate) |

**Total: 6 baris ditambahkan, 14 baris dihapus**

---

### Fix 1 — `seed.ts`: Idempotent Upsert

Mengosongkan `update` block pada **4 user upsert** agar seed aman dijalankan berkali-kali.

| User | Email | Baris |
|------|-------|-------|
| Admin | `admin@maleo.sch.id` | 13–15 |
| Kepala Sekolah | `kepala@maleo.sch.id` | 43–45 |
| Siswa | `siswa@maleo.sch.id` | 148–149 |
| Wali Murid | `wali@maleo.sch.id` | 208 |

**Sebelum:**
```typescript
const admin = await prisma.user.upsert({
  where: { email: adminEmail },
  update: {
    password: adminPassword,   // ← BERBAHAYA: reset password tiap seed
  },
  create: { ... },
});
```

**Sesudah:**
```typescript
const admin = await prisma.user.upsert({
  where: { email: adminEmail },
  update: {},   // ← AMAN: tidak sentuh data existing
  create: { ... },
});
```

**Perilaku upsert sekarang:**
- Jika user **belum ada** → `create` dijalankan (buat user baru dengan password default)
- Jika user **sudah ada** → `update: {}` dijalankan (tidak ada perubahan apapun)

---

### Fix 2 — `package.json`: Auto Seed on Start

```diff
 "scripts": {
-  "start": "node dist/src/index.js",
+  "start": "prisma migrate deploy && prisma db seed && node dist/src/index.js",
 }
```

Sekarang setiap kali `npm run start` dipanggil:
1. **`prisma migrate deploy`** — Jalankan migrasi database yang pending
2. **`prisma db seed`** — Jalankan seed (aman karena sudah idempotent)
3. **`node dist/src/index.js`** — Start Express server

> **Catatan:** Config `prisma.seed` sudah ada sebelumnya di package.json, tidak perlu ditambahkan.

---

### Fix 3 — `Dockerfile`: Sederhanakan CMD

```diff
-CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
+CMD ["npm", "run", "start"]
```

**Alasan:** `prisma migrate deploy` sudah dipindahkan ke start script di package.json. Jika tetap di Dockerfile CMD, maka migrate akan berjalan **2x** (duplikat). CMD sekarang cukup memanggil `npm run start` yang menangani semuanya.

---

## 🔄 Flow Eksekusi di Container

```
Container Start
  └── npm run start
        ├── 1. prisma migrate deploy   → Apply pending migrations
        ├── 2. prisma db seed           → Create missing users (skip existing)
        └── 3. node dist/src/index.js   → Start API server
```

---

## ✅ Checklist Verifikasi

| # | Item | Status |
|---|------|--------|
| 1 | Semua `update: { password }` di seed.ts → `update: {}` | ✅ |
| 2 | Start script include `prisma migrate deploy` + `prisma db seed` | ✅ |
| 3 | Tidak ada duplikasi `migrate deploy` (Dockerfile + package.json) | ✅ |
| 4 | Config `prisma.seed` ada di package.json | ✅ (sudah ada) |
| 5 | `docker compose up -d --build` berhasil | ✅ |
| 6 | Commit & push ke `main` | ✅ (`bfdbfe9`) |

---

## 🧪 Cara Test

### Test 1: Database Kosong (Simulasi Deploy Baru)

```bash
docker compose down -v          # Hapus volume, database bersih
docker compose up -d --build    # Build & start ulang
docker compose logs maleo-api   # Lihat log seed
```

**Hasil yang diharapkan:** Log menampilkan `🌱 Memulai pembersihan...` dan semua akun berhasil dibuat. Login dengan akun default berhasil.

### Test 2: Restart (Simulasi Redeploy)

```bash
docker compose restart    # Restart tanpa hapus volume
```

**Hasil yang diharapkan:** Seed jalan tapi tidak mengubah apapun. Password yang sudah diubah manual **tetap sama**.

### Test 3: Rebuild (Simulasi Update Code)

```bash
docker compose up -d --build    # Rebuild image dan start
```

**Hasil yang diharapkan:** Migrate + seed jalan, data existing aman, server start normal.

---

## 👤 Akun Default

Akun berikut otomatis dibuat saat database kosong:

| Role | Email | Password Default | Keterangan |
|------|-------|------------------|------------|
| Admin | `admin@maleo.sch.id` | `password` | Akses penuh |
| Kepala Sekolah | `kepala@maleo.sch.id` | `password` | NIP: 196503151989031001 |
| Guru (Kurikulum) | `kurikulum@maleo.sch.id` | `password` | Wakil Kepala Kurikulum |
| Siswa | `siswa@maleo.sch.id` | `password` | NIS: TEST001 |
| Wali Murid | `wali@maleo.sch.id` | `password` | Linked ke Siswa Test |

> ⚠️ **PENTING:** Segera ganti password default setelah deploy pertama kali ke production!

---

## 📌 Catatan Teknis

- **`ts-node`** digunakan untuk menjalankan seed karena file seed masih dalam TypeScript (`seed.ts`). Package `ts-node` ter-install di Docker image karena `npm ci` tidak menggunakan flag `--production`.
- **`prisma db seed`** akan menggunakan config dari `package.json` → `prisma.seed` → `ts-node prisma/seed.ts`
- Jika di masa depan ingin mengoptimasi ukuran Docker image dengan memisahkan build stage dan production stage (multi-stage build), seed perlu di-compile ke JS terlebih dahulu dan config `prisma.seed` diubah ke `node dist/prisma/seed.js`.
