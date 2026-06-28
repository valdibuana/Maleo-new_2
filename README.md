# 📚 SIAKAD Maleo

Sistem Informasi Akademik (SIAKAD) berbasis web yang dirancang untuk Sekolah Maleo. Sistem ini menyatukan pengelolaan administrasi, kegiatan belajar mengajar (KBM), absensi, dan penilaian dalam satu platform terintegrasi yang dapat diakses oleh lima peran pengguna secara bersamaan.

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | [Next.js](https://nextjs.org/) (App Router, TypeScript) |
| Backend | [Express.js](https://expressjs.com/) (Node.js, TypeScript) |
| Database | [PostgreSQL](https://www.postgresql.org/) |
| ORM | [Prisma](https://www.prisma.io/) |

---

## 📁 Struktur Project

```
maleo-new/
├── api/                    # Backend — Express.js + Prisma
│   ├── prisma/
│   │   ├── schema.prisma   # Definisi model & relasi database
│   │   ├── seed.ts         # Data awal (seeder) sistem
│   │   └── migrations/     # Riwayat migrasi database
│   ├── src/
│   │   ├── index.ts        # Entry point, registrasi seluruh route
│   │   ├── routes/         # Definisi endpoint API per modul
│   │   ├── controllers/    # Logika handler tiap endpoint
│   │   ├── services/       # Logika bisnis (kalkulasi nilai, dll)
│   │   ├── middleware/     # Auth (JWT), RBAC, rate-limit, sanitize
│   │   └── lib/            # Error handler, helper umum
│   ├── uploads/            # File yang diunggah (materi, tugas)
│   └── package.json
├── web/                    # Frontend — Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/              # Halaman login (semua peran)
│   │   │   ├── force-change-password/  # Ganti password pertama / lupa password
│   │   │   ├── (admin)/            # Portal Admin & Kepala Sekolah
│   │   │   │   ├── dashboard/
│   │   │   │   ├── teachers/
│   │   │   │   ├── students/
│   │   │   │   ├── subjects/
│   │   │   │   ├── schedules/
│   │   │   │   ├── academic-years/
│   │   │   │   ├── guardians/
│   │   │   │   ├── announcements/
│   │   │   │   ├── grades/
│   │   │   │   ├── scores/
│   │   │   │   ├── attendances/
│   │   │   │   ├── teacher-attendances/
│   │   │   │   ├── principal/
│   │   │   │   └── principal-dashboard/
│   │   │   ├── hub/                # Portal Guru & Siswa (Maleo Hub)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── atp/            # Rencana Pelaksanaan Pembelajaran (RPS)
│   │   │   │   ├── materials/      # Materi belajar (LMS)
│   │   │   │   ├── assignments/    # Tugas & pengumpulan
│   │   │   │   ├── absensi/        # Absensi kelas (guru input)
│   │   │   │   ├── attendance/     # Riwayat absensi (siswa lihat)
│   │   │   │   ├── grades/         # Input & lihat nilai
│   │   │   │   ├── checkin/        # Presensi mandiri guru
│   │   │   │   ├── consultations/  # Konsultasi guru–wali murid
│   │   │   │   ├── schedules/      # Jadwal mengajar / belajar
│   │   │   │   └── analytics/      # Analitik performa
│   │   │   └── connect/            # Portal Wali Murid (Maleo Connect)
│   │   │       ├── dashboard/
│   │   │       ├── children/       # Data anak terhubung
│   │   │       ├── attendances/    # Riwayat kehadiran anak
│   │   │       ├── grades/         # Nilai akademik anak
│   │   │       ├── tasks/          # Tugas anak
│   │   │       ├── announcements/  # Pengumuman sekolah
│   │   │       ├── consultations/  # Konsultasi dengan guru
│   │   │       └── analytics/      # Analisis minat & bakat anak
│   │   ├── components/     # Komponen UI yang dapat digunakan ulang
│   │   ├── services/       # Fungsi pemanggil API (fetch wrapper)
│   │   ├── lib/            # Utility: auth-utils, roles, helper
│   │   ├── types/          # Tipe TypeScript
│   │   └── middleware.ts   # Route Guard (RBAC berbasis JWT)
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🔐 Sistem Login & Alur Akses

Semua pengguna masuk melalui satu halaman login (`/login`). Setelah autentikasi, server mengembalikan **JWT token** yang menyimpan informasi peran (*role*). Middleware frontend (`middleware.ts`) membaca token tersebut dan secara otomatis mengarahkan pengguna ke portal yang sesuai:

| Peran | Diarahkan Ke |
|-------|-------------|
| `ADMIN` | `/dashboard` |
| `KEPALA_SEKOLAH` | `/principal-dashboard` |
| `TEACHER` | `/hub/dashboard` |
| `STUDENT` | `/hub/dashboard` |
| `GUARDIAN` | `/connect/dashboard` |

Pengguna yang mencoba membuka halaman di luar portalnya akan otomatis diredirect. Sesi dijaga dengan **JWT Access Token + Refresh Token** yang disimpan di cookie.

### Lupa Password
Pengguna yang lupa password tidak perlu meminta reset manual ke Admin. Mereka dapat menggunakan fitur **"Lupa Password"** di halaman login dengan alur:
1. Klik **"Lupa Password"** di halaman login.
2. Masukkan identitas unik (email / NIP / NIS) beserta **Password Default Sistem**.
   - Password Default dibentuk dari: `{inisial peran}{kode login}`. Contoh — siswa dengan NIS `123456` → password default: `S123456`.
3. Jika cocok, sistem meminta pengguna membuat password baru.
4. Setelah tersimpan, pengguna langsung bisa login dengan password baru.

---

## ✨ Fitur per Portal

### 👨‍💼 Portal Admin (`/dashboard` area)

Admin adalah operator sekolah yang mengelola data master dan konfigurasi sistem.

- **Manajemen Data Guru** — Tambah, ubah, nonaktifkan data guru beserta informasi NIP dan penugasan.
- **Manajemen Data Siswa** — Tambah, ubah, nonaktifkan data siswa beserta NIS dan kelas.
- **Manajemen Wali Murid** — Mendaftarkan orang tua dan menghubungkannya ke data siswa.
- **Pengaturan Tahun Ajaran & Kelas** — Menentukan tahun ajaran aktif, membuat kelas, dan menunjuk wali kelas.
- **Pengaturan Mata Pelajaran** — Mendaftarkan mata pelajaran beserta jumlah jam pelajaran per minggu.
- **Penyusunan Jadwal KBM** — Memetakan slot jadwal: hari, jam, ruang kelas, guru pengampu, dan mata pelajaran.
- **Konfigurasi Bobot Nilai** — Menentukan persentase kontribusi PPTS (UTS) dan PSAS (UAS) terhadap nilai akhir per mata pelajaran.
- **Manajemen Pengumuman** — Membuat dan mempublikasikan pengumuman yang dapat ditargetkan ke kelompok tertentu (guru, siswa, orang tua).
- **Monitoring Absensi Siswa** — Melihat rekapitulasi data kehadiran siswa.
- **Monitoring Absensi Guru** — Melihat dan memvalidasi catatan kehadiran harian guru.
- **Ekspor Absensi ke Excel** — Mengunduh rekap absensi siswa atau guru ke file `.xlsx` berformat standar Sekolah Maleo.

### 🏫 Portal Kepala Sekolah (`/principal-dashboard` area)

Kepala Sekolah memiliki akses **read-only** ke data operasional sekolah. Tidak dapat mengubah data administrasi.

- **Dashboard Monitoring Utama** — Ringkasan statistik operasional: grafik kehadiran total, rata-rata nilai, jumlah siswa/guru aktif.
- **Monitoring Kehadiran Guru** — Memantau kehadiran harian guru secara real-time.
- **Laporan Absensi Siswa** — Melihat grafik dan statistik kehadiran siswa per kelas.
- **Pemantauan Pengumuman Aktif** — Melihat daftar pengumuman yang sedang berjalan di seluruh lingkungan sekolah.

### 👨‍🏫 Portal Guru — Maleo Hub (`/hub` area)

Guru dan Siswa berbagi portal yang sama (`/hub`), namun konten yang ditampilkan disesuaikan berdasarkan peran.

**Fitur khusus Guru:**
- **Dashboard Mengajar** — Jadwal mengajar hari ini, pengumuman terbaru, dan ringkasan statistik kelas bimbingan.
- **Rencana Pelaksanaan Pembelajaran (RPS/ATP)** — Wizard interaktif untuk menyusun rencana KBM per pertemuan (maksimal 16 pertemuan/semester).
- **Upload Materi Belajar (LMS)** — Mengunggah bahan ajar berupa file (PDF, PPT, Word, dll.) atau tautan video/website eksternal.
- **Input Absensi Kelas** — Mencatat kehadiran siswa (Hadir / Izin / Sakit / Alpa) per pertemuan, dengan kolom catatan.
- **Input & Konfirmasi Nilai** — Memasukkan nilai tugas, kuis, UTS, UAS; sistem menghitung nilai akhir otomatis berdasarkan bobot yang dikonfigurasi Admin.
- **Penguncian Nilai (Data Locking)** — Setelah guru mengonfirmasi, nilai dikunci dan tidak dapat diubah kembali untuk menjaga integritas data.
- **Presensi Mandiri Guru (Self Check-in)** — Guru melakukan absensi kehadiran mereka sendiri ke sistem.
- **Konsultasi dengan Wali Murid** — Ruang komunikasi dua arah dengan orang tua siswa untuk membahas perkembangan belajar.
- **Ekspor Absensi ke Excel** — Mengunduh rekap kehadiran kelas ke file Excel.

### 👨‍🎓 Portal Siswa — Maleo Hub (`/hub` area)

**Fitur khusus Siswa:**
- **Dashboard Belajar** — Tugas aktif, pengumuman, jadwal hari ini, dan grafik rata-rata nilai pribadi.
- **Materi Pembelajaran** — Melihat dan mengunduh bahan ajar yang diunggah guru, termasuk detail pertemuan RPS.
- **Tugas & Pengumpulan** — Melihat daftar tugas beserta deadline, dan mengumpulkan jawaban berupa file atau teks langsung di sistem.
- **Riwayat Absensi** — Melihat persentase kehadiran sendiri per mata pelajaran, ditampilkan dengan indikator warna.
- **Nilai & Rapor** — Melihat rekap nilai tugas, kuis, PPTS (UTS), PSAS (UAS), dan nilai akhir secara transparan (hanya baca).

### 👪 Portal Wali Murid — Maleo Connect (`/connect` area)

- **Dashboard Monitoring Anak** — Ringkasan status kehadiran harian anak, pengumuman khusus orang tua, tugas anak yang belum selesai.
- **Laporan Kehadiran Detail** — Memantau riwayat keaktifan kehadiran anak (Hadir, Sakit, Izin, Alpa) per tanggal.
- **Nilai Akademik Anak** — Melihat rekap nilai anak secara transparan, termasuk nilai akhir hasil kalkulasi sistem.
- **Tugas Anak** — Memantau daftar tugas yang belum dikumpulkan oleh anak.
- **Analisis Minat & Bakat** — Melihat rekomendasi analitik kecenderungan minat belajar anak berdasarkan data nilai dan keaktifan.
- **Konsultasi dengan Guru** — Menghubungi wali kelas atau guru pengampu untuk mendiskusikan perkembangan anak.

---

## ⚙️ Cara Menjalankan Project

### Prasyarat

Pastikan sudah terinstall:
- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) v14+
- npm

---

### 1. Clone Repository

```bash
git clone https://github.com/valdibuana/Maleo_Project.git
cd Maleo_Project
```

---

### 2. Setup Backend (API)

```bash
cd api
npm install
```

Buat file `.env` di folder `api/` (salin dari `.env.example`):

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/siakad_maleo"
PORT=4000
JWT_SECRET=isi_dengan_secret_yang_kuat_dan_acak
CLIENT_URL=http://localhost:3000
```

> Ganti `USER` dan `PASSWORD` sesuai konfigurasi PostgreSQL kamu. `JWT_SECRET` harus berupa string acak yang kuat — **jangan gunakan nilai default**.

Jalankan migrasi & generate Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

(Opsional) Isi data awal (seeder):

```bash
npx prisma db seed
```

Jalankan server backend:

```bash
npm run dev
```

API akan berjalan di `http://localhost:4000`

---

### 3. Setup Frontend (Web)

```bash
cd ../web
npm install
```

Buat file `.env` di folder `web/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Jalankan aplikasi frontend:

```bash
npm run dev
```

Web akan berjalan di `http://localhost:3000`

---

## 🚀 Menjalankan Keduanya Sekaligus

Buka dua terminal terpisah:

**Terminal 1 — Backend:**
```bash
cd api && npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd web && npm run dev
```

---

## 🐳 Menjalankan dengan Docker

Project ini sudah dilengkapi:
- `api/Dockerfile`
- `web/Dockerfile`
- `docker-compose.yml`

Timezone untuk ketiga service (`web`, `api`, dan `db`) diset ke **UTC+7** menggunakan `Asia/Jakarta`.

### Jalankan semua service

```bash
docker compose up -d --build
```

Service yang berjalan:
- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

### Stop service

```bash
docker compose down
```

### Reset database (hapus volume PostgreSQL)

```bash
docker compose down -v
```

---

## 🗄️ Setup Database PostgreSQL

1. Buat database baru:
```sql
CREATE DATABASE siakad_maleo;
```

2. Sesuaikan `DATABASE_URL` di file `.env` backend.

3. Jalankan migrasi Prisma seperti langkah di atas.

### Password default seeder

Akun yang dibuat melalui seeder menggunakan password default:

```
password
```

Akun admin default: `admin@maleo.sch.id`

---

## 👥 Kontribusi

1. Fork repository ini
2. Buat branch fitur baru: `git checkout -b feature/nama-fitur`
3. Commit perubahan: `git commit -m "feat: deskripsi fitur"`
4. Push ke branch: `git push origin feature/nama-fitur`
5. Buat Pull Request

---

## 📄 Lisensi

Project ini dibuat untuk keperluan akademik oleh tim **Maleo**.
#   M a l e o - n e w _ 2  
 