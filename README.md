# 🎓 SIAKAD MALEO

SIAKAD Maleo adalah Sistem Informasi Akademik berbasis web yang dirancang untuk mendukung operasional sekolah secara terintegrasi, mulai dari manajemen pengguna, akademik, absensi, LMS, pengumuman, hingga monitoring wali murid.

Proyek ini dibangun dengan arsitektur modern menggunakan Next.js, Express.js, Prisma ORM, PostgreSQL, JWT Authentication, dan Docker untuk deployment production.

---

## 🚀 Features

### Authentication & Security

* JWT Authentication
* Refresh Token Rotation
* Role-Based Access Control (RBAC)
* Force Change Password
* Login menggunakan Email atau User Code (NIP/NIS)
* Protected Routes
* Secure API Middleware

### Academic Management

* Tahun Ajaran
* Mata Pelajaran
* Kelas
* Guru
* Siswa
* Wali Murid
* Kepala Sekolah

### Attendance System

* Absensi Siswa
* Rekap Kehadiran
* Export Excel
* Validasi Ownership Guru
* Monitoring Kehadiran

### LMS (Learning Management System)

* Modul Pembelajaran
* ATP (Alur Tujuan Pembelajaran)
* Pertemuan Pembelajaran
* Materi Pembelajaran
* Tracking Akses Materi
* Upload PDF, PPT, DOCX, Video

### Announcement System

* Pengumuman Sekolah
* Role-Based Announcement
* Notification Bell
* Quick Announcement Popup

### Reporting

* Rekap Absensi
* Export Excel
* Dashboard Monitoring Akademik

---

## 👥 Roles

### Admin

* Mengelola seluruh data master
* Mengelola pengguna
* Mengelola konfigurasi sistem

### Kepala Sekolah

* Monitoring akademik
* Monitoring absensi
* Monitoring laporan
* Tidak memiliki akses CRUD LMS

### Teacher

* Mengelola ATP
* Mengelola Materi Pembelajaran
* Mengelola Absensi
* Hanya dapat mengakses kelas dan mata pelajaran yang dimiliki

### Student

* Melihat materi pembelajaran
* Mengakses pengumuman
* Melihat data akademik pribadi

### Guardian

* Monitoring akademik anak
* Monitoring absensi anak
* Melihat materi pembelajaran anak

---

## 🏗 Tech Stack

### Frontend

* Next.js 14
* TypeScript
* Tailwind CSS
* React Query
* Axios

### Backend

* Express.js
* TypeScript
* Prisma ORM
* JWT Authentication
* Multer

### Database

* PostgreSQL

### DevOps

* Docker
* Docker Compose

---

## 📁 Project Structure

```text
SIAKAD-MALEO/
│
├── api/
│   ├── prisma/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── web/
│   ├── app/
│   ├── components/
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── .env.production
└── README.md
```

---

## 🔒 Security Principles

* Backend authorization wajib untuk seluruh endpoint
* Ownership validation pada seluruh data akademik
* Teacher hanya dapat mengakses data miliknya
* Student tidak dapat mengakses data master
* Guardian hanya dapat melihat data anaknya
* Kepala Sekolah hanya monitoring
* Refresh Token Rotation
* Role Validation
* Input Validation
* Secure File Upload

---

## 🐳 Docker Deployment

Build dan jalankan seluruh service:

```bash
docker compose up -d --build
```

Melihat status container:

```bash
docker ps
```

Menghentikan service:

```bash
docker compose down
```

Menghapus seluruh volume database:

```bash
docker compose down -v
```

---

## 🗄 Database Migration

Menjalankan migration:

```bash
npx prisma migrate deploy
```

Generate Prisma Client:

```bash
npx prisma generate
```

Melihat status migration:

```bash
npx prisma migrate status
```

---

## 📈 Current Status

Project Status:

* Authentication System ✅
* Academic Management ✅
* Attendance System ✅
* LMS Module ✅
* Announcement System ✅
* Docker Deployment ✅
* Production Hardening 🚧
* VPS Deployment 🚧

Progress: ~95%

---

## ⚠ Important Notes

Sistem menerapkan ownership validation yang ketat:

* Guru hanya dapat melihat kelas yang diajar.
* Guru hanya dapat melihat mata pelajaran yang dimiliki.
* Guru tidak dapat mengakses data guru lain.
* Wali murid hanya dapat melihat data anak yang terhubung.
* Kepala sekolah hanya melakukan monitoring akademik.

Seluruh validasi dilakukan di backend untuk mencegah bypass API secara manual.

---

## 📄 License

Private Project – SIAKAD Maleo

Developed for internal academic management and educational operations.
