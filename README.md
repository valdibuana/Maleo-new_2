# 📚 SIAKAD Maleo

Sistem Informasi Akademik (SIAKAD) berbasis web untuk manajemen akademik sekolah, mencakup pengelolaan data siswa, guru, jadwal, absensi, dan nilai.

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | [Next.js](https://nextjs.org/) (React Framework) |
| Backend | [Express.js](https://expressjs.com/) (Node.js) |
| Database | [PostgreSQL](https://www.postgresql.org/) |
| ORM | [Prisma](https://www.prisma.io/) |

## 📁 Struktur Project

```
web_siakad/
├── api/          # Backend - Express.js + Prisma
│   ├── prisma/   # Schema & migrations database
│   ├── src/      # Source code API
│   ├── .env      # Environment variables backend
│   └── package.json
├── web/          # Frontend - Next.js
│   ├── src/
│   │   ├── app/         # Pages & routing (App Router)
│   │   ├── components/  # Reusable UI components
│   │   ├── lib/         # Utilities & helper
│   │   ├── services/    # API service calls
│   │   └── types/       # TypeScript types
│   ├── .env      # Environment variables frontend
│   └── package.json
└── README.md
```

## ✨ Fitur

### 👨‍💼 Role: Akademik (Waka Kurikulum / Operator / Admin)
- **F-AD-01** — Manajemen Tahun Ajaran & Kelas
- **F-AD-04** — Penjadwalan Otomatis
- **F-AD-05** — Monitoring Pengisian Nilai

### 👨‍🏫 Role: Guru
- **F-GR-01** — Dashboard Mengajar (Jadwal, Tugas, Notifikasi)
- **F-GR-02** — Absensi Kelas Digital
- **F-GR-05** — Input Nilai

### 👨‍🎓 Role: Siswa
- **F-SW-01** — Dashboard Pribadi (Jadwal, Tugas, Notifikasi)
- **F-SW-04** — Lihat Nilai & Rapor
- **F-SW-05** — Lihat Riwayat Absensi

---

## ⚙️ Cara Menjalankan Project

### Prasyarat

Pastikan sudah terinstall:
- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) v14+
- npm atau yarn

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

Buat file `.env` di folder `api/`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/siakad_maleo"
PORT=5000
JWT_SECRET=your_jwt_secret_key
```

> Ganti `USER`, `PASSWORD`, dan nama database sesuai konfigurasi PostgreSQL kamu.

Jalankan migrasi database:

```bash
npx prisma migrate dev
npx prisma generate
```

(Opsional) Isi data awal:

```bash
npx prisma db seed
```

Jalankan server:

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

Jalankan aplikasi:

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

### Seeder default password

Default password untuk akun yang dibuat oleh seeder sekarang adalah:

```text
password
```

---

## 🗄️ Setup Database PostgreSQL

1. Buat database baru:
```sql
CREATE DATABASE siakad_maleo;
```

2. Sesuaikan `DATABASE_URL` di file `.env` backend dengan kredensial PostgreSQL kamu.

3. Jalankan migrasi Prisma seperti langkah di atas.

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
