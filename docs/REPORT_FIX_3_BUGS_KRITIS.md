# LAPORAN PERBAIKAN 3 BUG KRITIS — DEMO SIAKAD MALEO
**Tanggal:** 7 Juli 2026  
**Tujuan:** Demo ke Kepala Sekolah  
**Status:** ✅ Selesai

---

## DAFTAR PERUBAHAN

| # | Bug | File yang Diubah | Status |
|---|-----|------------------|--------|
| 1 | Default Attendance "hadir" | `api/src/routes/attendances.route.ts` + `web/src/app/hub/absensi/input/page.tsx` | ✅ |
| 2 | JWT_REFRESH_SECRET fallback | `api/src/lib/jwt.ts` + `api/.env` + `docker-compose.yml` | ✅ |
| 3 | Hapus seed data dummy | `api/src/scripts/cleanTestData.ts` (file baru) | ✅ |

---

## FIX 1 — DEFAULT ATTENDANCE BUG (PALING KRITIS)

### Masalah
Siswa yang **tidak memiliki record attendance** otomatis dianggap **"hadir"** karena kode:
```typescript
status: attendance ? attendance.status : "hadir"
```
Ini salah secara akademik — siswa tanpa data harusnya **null/tidak diketahui**, bukan hadir.

### Perubahan di Backend (`api/src/routes/attendances.route.ts`)

**Sebelum:**
```typescript
return {
  studentId: s.id,
  nis: s.nis,
  name: s.name,
  status: attendance ? attendance.status : "hadir", // ❌ default hadir
  note: attendance ? attendance.note : "",
};
```

**Sesudah:**
```typescript
return {
  studentId: s.id,
  nis: s.nis,
  name: s.name,
  status: attendance?.status ?? null,   // ✅ null = belum diinput
  note: attendance?.note ?? null,       // ✅ null, bukan string kosong
  hasRecord: !!attendance,              // ✅ flag baru: apakah guru sudah input
};
```

### Perubahan di Frontend (`web/src/app/hub/absensi/input/page.tsx`)

1. **Type `AttendanceRecord.status`** sekarang menerima `null`:
   ```typescript
   status: "hadir" | "izin" | "sakit" | "alpa" | null;
   ```

2. **`loadStudentsForInput`** — tidak lagi default ke "hadir":
   ```typescript
   // Sebelum: status: s.status || "hadir"
   // Sesudah: status: s.status  // null jika belum diinput
   ```

3. **Statistik baru "Belum Diinput"**:
   ```typescript
   const stats = {
     hadir: ..., izin: ..., sakit: ..., alpa: ...,
     belumDiinput: studentRecords.filter(r => r.status === null).length, // ✅ baru
   };
   ```

4. **Card statistik** — grid berubah dari 4 kolom menjadi 5 kolom, menambahkan:
   - Card "Belum Diinput" dengan warna abu-abu netral (border-l-gray-400)

5. **Tampilan tabel** — jika `status === null`:
   - Menampilkan label **"Belum Diinput"** dengan teks abu-abu
   - Tombol status (H/I/S/A) tetap tersedia untuk dipilih guru
   - Guru **wajib aktif memilih** status — tidak ada default otomatis

---

## FIX 2 — JWT_REFRESH_SECRET

### Masalah
Refresh token dan access token di-sign dengan **secret yang sama** karena fallback:
```typescript
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
```
Keduanya bisa digunakan secara bergantian — celah keamanan.

### Perubahan di `api/src/lib/jwt.ts`

**Sebelum:**
```typescript
const REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || ACCESS_SECRET;
```

**Sesudah:**
```typescript
const REFRESH_SECRET: string = (() => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_REFRESH_SECRET tidak di-set di environment variables. " +
      "Tambahkan JWT_REFRESH_SECRET ke file .env"
    );
  }
  return secret;
})();
```
- ✅ Tidak ada fallback ke `JWT_SECRET`
- ✅ Error eksplisit saat startup jika tidak di-set

### Perubahan di `api/.env`
```
JWT_REFRESH_SECRET="616599fa0e31d025b13d65679f9a35ab009c1b8f6417c771cbd04846622e435e"
```
- ✅ Nilai random 64 karakter hex (32 bytes)
- ✅ Berbeda dari `JWT_SECRET="maleo_dev_jwt_secret_2026_change_me"`

### Perubahan di `docker-compose.yml`
```yaml
JWT_REFRESH_SECRET: 616599fa0e31d025b13d65679f9a35ab009c1b8f6417c771cbd04846622e435e
```
- ✅ Konsisten dengan `.env`

---

## FIX 3 — HAPUS SEED DATA DUMMY

### Masalah
Akun test dari `seed.ts` dengan password "password" masih ada di database — risiko keamanan untuk demo.

### Solusi: Script `api/src/scripts/cleanTestData.ts` (file baru)

```typescript
const testEmails = [
  "admin@maleo.sch.id",
  "kepala@maleo.sch.id",
  "kurikulum@maleo.sch.id",
  "siswa@maleo.sch.id",
  "wali@maleo.sch.id",
];
```

Script akan:
1. Mencari setiap email di database
2. Jika ditemukan → hapus user (cascade ke relasi)
3. Jika tidak ditemukan → skip
4. Output log untuk setiap akun

### Cara Menjalankan
```bash
docker compose exec api npx ts-node src/scripts/cleanTestData.ts
```

Atau via SQL langsung:
```bash
docker compose exec db psql -U postgres -d maleo -c "SELECT id, name, email, role FROM users ORDER BY id;"
```

---

## CHECKLIST DEMO

| Item | Status |
|------|--------|
| Default "hadir" bug sudah di-fix | ✅ |
| JWT_REFRESH_SECRET sudah set dengan nilai unik | ✅ |
| docker compose rebuild setelah update .env | ⏳ (perlu dijalankan) |
| Akun test dummy sudah dihapus | ⏳ (perlu jalankan script) |
| Login semua role berhasil | ⏳ (perlu di-test) |
| Export kehadiran berfungsi | ✅ (tidak diubah) |
| ATP tidak menampilkan kelas salah | ✅ (tidak diubah) |

### Perintah Rebuild Docker
```bash
docker compose down
docker compose build --no-cache api
docker compose up -d
```

---

## FILE YANG DIUBAH/DITAMBAH

| File | Tipe Perubahan |
|------|---------------|
| `api/src/routes/attendances.route.ts` | ✏️ Edit (lines 90-99) |
| `web/src/app/hub/absensi/input/page.tsx` | ✏️ Edit (types, loadStudents, stats, table) |
| `api/src/lib/jwt.ts` | ✏️ Edit (lines 6-15) |
| `api/.env` | ✏️ Edit (JWT_REFRESH_SECRET) |
| `docker-compose.yml` | ✏️ Edit (JWT_REFRESH_SECRET) |
| `api/src/scripts/cleanTestData.ts` | ➕ Baru |

---

*Laporan ini dibuat otomatis berdasarkan perubahan kode yang telah dilakukan.*