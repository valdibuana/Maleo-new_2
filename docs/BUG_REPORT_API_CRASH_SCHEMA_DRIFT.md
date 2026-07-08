# 🐛 Bug Report & Fix: API Container Crash Loop → Login 500 Error

**Tanggal:** 8 Juli 2026  
**Status:** ✅ **Fixed & Deployed** — Commit `c5caaef` pushed ke `main`  
**Severity:** 🔴 **CRITICAL** — Semua user tidak bisa login, API tidak jalan  
**Tipe:** Schema Drift + DevOps Configuration Bug

---

## 📋 Ringkasan Eksekutif

Setelah deploy dengan fix auto-seed (`bfdbfe9`), container API masuk ke **crash loop** dan tidak pernah start. Akibatnya semua request login dari Next.js frontend gagal dengan HTTP **500 Internal Server Error**, diikuti browser error:

```
JSON.parse: unexpected character at line 1 column 1 of the JSON data
POST /api/auth/login → 500 Internal Server Error
```

Penyebab: **Schema Drift** — Prisma schema mendefinisikan kolom `deleted_at` di 5 model, tapi migrasi `add_soft_delete` (20260622) hanya menambahkan kolom tersebut ke 2 tabel (`students`, `teachers`). Tiga tabel lain (`guardians`, `classes`, `subjects`) tertinggal tanpa kolom itu di database.

---

## 🔍 Diagnosis & Root Cause Analysis

### Gejala yang Dilaporkan

| Gejala | Detail |
|--------|--------|
| Error di browser | `JSON.parse: unexpected character at line 1 column 1` |
| HTTP Status | `500 Internal Server Error` |
| Endpoint | `POST /api/auth/login` |
| Waktu kejadian | Segera setelah deploy dengan fix auto-seed |

### Investigasi

**Step 1 — Cek status container:**
```bash
docker compose ps
```
```
NAME        IMAGE          STATUS                         PORTS
maleo-api   maleo-new-api  Restarting (1) 6 seconds ago  ← CRASH LOOP
maleo-db    postgres:16    Up 2 minutes (healthy)
maleo-web   maleo-new-web  Up 2 minutes                   0.0.0.0:3000->3000/tcp
```

**Step 2 — Baca log container API:**
```bash
docker compose logs api --tail 80
```

Log menunjukkan error Prisma saat seed:

```
PrismaClientKnownRequestError:
Invalid `prisma.subject.upsert()` invocation:

The column `subjects.deleted_at` does not exist in the current database.

code: 'P2022',
meta: { modelName: 'Subject', column: 'subjects.deleted_at' }

An error occurred while running the seed command:
Error: Command failed with exit code 1: ts-node prisma/seed.ts
```

**Step 3 — Verifikasi kolom di database:**
```sql
SELECT table_name FROM information_schema.columns 
WHERE column_name = 'deleted_at' 
ORDER BY table_name;
```
```
 table_name
------------
 students
 teachers
(2 rows)
```

**Step 4 — Audit Prisma schema vs database:**

```bash
grep -n "deletedAt.*@map" api/prisma/schema.prisma
```

Hasilnya:

| Baris | Model | `@map` | Di DB? |
|-------|-------|--------|--------|
| 64 | `Student` | `"deleted_at"` | ✅ Ada |
| 94 | `Teacher` | `"deleted_at"` | ✅ Ada |
| 142 | `Guardian` | `"deleted_at"` | ❌ **Missing** |
| 173 | `Class` | `"deleted_at"` | ❌ **Missing** |
| 195 | `Subject` | `"deleted_at"` | ❌ **Missing** ← crash point |

### Root Cause

```
Migrasi 20260622135850_add_soft_delete
├── ALTER TABLE "students" ADD COLUMN "deleted_at" TIMESTAMP(3)  ✅
├── ALTER TABLE "teachers" ADD COLUMN "deleted_at" TIMESTAMP(3)  ✅
├── ALTER TABLE "guardians" ...                                   ❌ TIDAK ADA
├── ALTER TABLE "classes" ...                                     ❌ TIDAK ADA
└── ALTER TABLE "subjects" ...                                    ❌ TIDAK ADA
```

**Migrasi `add_soft_delete` tidak lengkap** — hanya menambahkan kolom ke 2 dari 5 tabel yang membutuhkannya. Ini adalah **schema drift**: Prisma schema dan database sudah tidak sinkron tanpa ada yang menyadari, karena:

1. Di development, mungkin kolom ini ditambahkan secara manual langsung ke DB tanpa membuat migrasi
2. Atau migrasi dibuat sebagian dan tidak di-review dengan teliti

### Mengapa Baru Ketahuan Sekarang?

Sebelum fix auto-seed, startup script adalah:
```
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
```

`npm run start` hanya menjalankan `node dist/src/index.js` — **seed tidak pernah dipanggil**. Jadi schema drift ini tidak pernah terdeteksi karena Prisma Client tidak pernah meng-query kolom `deleted_at` di `subjects` saat startup.

Setelah fix auto-seed, startup script menjadi:
```
"start": "prisma migrate deploy && prisma db seed && node dist/src/index.js"
```

Sekarang seed **dipanggil pertama kali**, dan saat `prisma.subject.upsert()` dijalankan, Prisma mencoba meng-query kolom yang tidak ada → **crash**.

### Cascade Effect

```
seed crash (exit code 1)
  └── && operator stop execution
        └── node dist/src/index.js TIDAK PERNAH DIJALANKAN
              └── Container exit → Docker restart policy → Crash loop
                    └── API tidak dapat diakses
                          └── Next.js proxy ke API gagal
                                └── Response bukan JSON (HTML error / empty)
                                      └── Browser: JSON.parse error
                                            └── HTTP 500 di browser
```

---

## 🛠️ Fix yang Diterapkan

### Migrasi Baru: `20260708100000_add_missing_soft_delete_columns`

File: [`api/prisma/migrations/20260708100000_add_missing_soft_delete_columns/migration.sql`](file:///d:/0- Projek Maleo/New_websiakad/maleo-new/api/prisma/migrations/20260708100000_add_missing_soft_delete_columns/migration.sql)

```sql
-- AlterTable: Add missing deleted_at columns to guardians, classes, and subjects
-- These columns exist in the Prisma schema but were missed in the original
-- soft_delete migration (20260622135850), which only added them to students and teachers.

ALTER TABLE "guardians" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "classes" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "subjects" ADD COLUMN "deleted_at" TIMESTAMP(3);
```

**Kenapa buat file migration manual (bukan `prisma migrate dev`)?**

Karena database sudah di-deploy dan sedang berjalan, menggunakan `prisma migrate dev` akan menyebabkan Prisma meminta reset migration history. Membuat file SQL manual dan menaruhnya di folder `migrations/` adalah cara yang benar untuk menambahkan migrasi ke production yang sudah berjalan — Prisma `migrate deploy` akan otomatis menerapkannya.

---

## ✅ Verifikasi

### Log Container Setelah Fix

```
maleo-api | Applying migration `20260708100000_add_missing_soft_delete_columns`
maleo-api | 
maleo-api | The following migration(s) have been applied:
maleo-api | migrations/
maleo-api |   └─ 20260708100000_add_missing_soft_delete_columns/
maleo-api |     └─ migration.sql
maleo-api | 
maleo-api | All migrations have been successfully applied.
maleo-api | Running seed command `ts-node prisma/seed.ts` ...
maleo-api | 🌱 Memulai pembersihan dan inisialisasi database (Clean State)...
maleo-api | 
maleo-api | ✅ Admin siap: admin@maleo.sch.id
maleo-api | ✅ Kepala Sekolah siap: kepala@maleo.sch.id
maleo-api | ✅ Tahun Ajaran Aktif siap: 2025/2026 Ganjil
maleo-api | ✅ Data Mata Pelajaran Default berhasil diinisialisasi
maleo-api | ✅ Siswa Test siap: TEST001
maleo-api | ✅ Wali Murid Test siap: wali@maleo.sch.id
maleo-api | 
maleo-api | 🎉 Database berhasil! Akun test tersedia:
maleo-api |    Admin:          admin@maleo.sch.id / password
maleo-api |    Kepala Sekolah: kepala@maleo.sch.id / password
maleo-api |    Guru:           kurikulum@maleo.sch.id / password
maleo-api |    Siswa:          siswa@maleo.sch.id / password (NIS: TEST001)
maleo-api |    Wali Murid:     wali@maleo.sch.id / password
maleo-api | 
maleo-api | 🌱  The seed command has been executed.
maleo-api | 🚀 Maleo API running on http://localhost:4000
maleo-api | 📋 Health check: http://localhost:4000/api/health
```

### Status Container Setelah Fix

```
NAME        STATUS
maleo-api   Up (healthy)   ← tidak lagi crash loop
maleo-db    Up (healthy)
maleo-web   Up
```

---

## 📁 File yang Diubah

| File | Aksi | Commit |
|------|------|--------|
| `api/prisma/migrations/20260708100000_.../migration.sql` | **NEW** — Tambah 3 `ALTER TABLE` | `c5caaef` |

**Total perubahan sesi ini (2 commit):**

| Commit | Hash | Deskripsi |
|--------|------|-----------|
| 1 | `bfdbfe9` | fix: make seed idempotent and auto-run on container start |
| 2 | `c5caaef` | fix: add missing deleted_at columns to guardians, classes, subjects |

---

## 📌 Lessons Learned & Rekomendasi

### 1. Selalu Jalankan `prisma migrate status` Sebelum Deploy

```bash
npx prisma migrate status
```

Perintah ini akan menampilkan apakah ada drift antara schema dan database.

### 2. Gunakan `prisma migrate diff` untuk Audit

```bash
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script
```

Ini akan menghasilkan SQL yang belum ada di migrasi — berguna untuk mendeteksi missing columns.

### 3. Test Seed Secara Mandiri di CI/CD

Tambahkan step di pipeline untuk menjalankan seed sebelum deploy:

```yaml
- name: Test seed
  run: |
    npx prisma migrate deploy
    npx prisma db seed
```

### 4. Jangan Buat Kolom di Database Secara Manual

Selalu buat kolom melalui `prisma migrate dev` untuk memastikan migrasi tersimpan dan dapat di-replay di environment lain.

---

## 🔗 Referensi

- [Prisma Error P2022 — Column does not exist](https://www.prisma.io/docs/orm/reference/error-reference#p2022)
- [Prisma Migrate Deploy](https://www.prisma.io/docs/orm/prisma-migrate/workflows/production-and-testing)
- Migrasi terkait: [`20260622135850_add_soft_delete`](file:///d:/0- Projek Maleo/New_websiakad/maleo-new/api/prisma/migrations/20260622135850_add_soft_delete/migration.sql)
- Fix migrasi: [`20260708100000_add_missing_soft_delete_columns`](file:///d:/0- Projek Maleo/New_websiakad/maleo-new/api/prisma/migrations/20260708100000_add_missing_soft_delete_columns/migration.sql)
