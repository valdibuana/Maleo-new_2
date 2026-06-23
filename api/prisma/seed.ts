import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai pembersihan dan inisialisasi database (Clean State)...\n");

  // 1. Inisialisasi Akun Admin Utama
  const adminEmail = "admin@maleo.sch.id";
  const adminPassword = await bcrypt.hash("password", 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: adminPassword,
    },
    create: {
      name: "Admin Utama",
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      force_change_password: false,
    },
  });

  console.log(`✅ Admin siap: ${admin.email}`);

  // 1b. Inisialisasi Akun Kepala Sekolah
  const principalEmail = "kepala@maleo.sch.id";
  const principalPassword = await bcrypt.hash("password", 10);

  const principal = await prisma.principal.upsert({
    where: { nip: "196503151989031001" },
    update: {},
    create: {
      nip: "196503151989031001",
      name: "Kepala Sekolah Maleo",
      email: principalEmail,
      principalCode: "KS001",
      status: "active",
    },
  });

  const principalUser = await prisma.user.upsert({
    where: { email: principalEmail },
    update: {
      password: principalPassword,
    },
    create: {
      name: "Kepala Sekolah Maleo",
      email: principalEmail,
      password: principalPassword,
      role: "kepala_sekolah",
      force_change_password: false,
      principalId: principal.id,
    },
  });

  console.log(`✅ Kepala Sekolah siap: ${principalUser.email}`);

  // 2. Inisialisasi Tahun Ajaran Aktif
  const yearName = "2025/2026";
  const semester = "Ganjil";

  let activeYear = await prisma.academicYear.findFirst({
    where: { name: yearName, semester: "Ganjil" }
  });

  if (!activeYear) {
    activeYear = await prisma.academicYear.create({
      data: {
        name: yearName,
        semester: "Ganjil",
        startDate: new Date("2025-07-14"),
        endDate: new Date("2025-12-19"),
        isActive: true,
      },
    });
  } else {
    activeYear = await prisma.academicYear.update({
      where: { id: activeYear.id },
      data: { isActive: true }
    });
  }

  console.log(`✅ Tahun Ajaran Aktif siap: ${activeYear.name} ${activeYear.semester}`);

  // 3. Inisialisasi Mata Pelajaran Default
  // Kita butuh setidaknya 1 guru untuk jadi relasi di model Subject.
  let defaultTeacher = await prisma.teacher.findFirst();
  if (!defaultTeacher) {
    const defaultTeacherEmail = "kurikulum@maleo.sch.id";
    const defaultTeacherUser = await prisma.user.upsert({
      where: { email: defaultTeacherEmail },
      update: {},
      create: {
        name: "Wakil Kepala Kurikulum",
        email: defaultTeacherEmail,
        password: await bcrypt.hash("password", 10),
        role: "teacher",
        force_change_password: false,
      }
    });

    defaultTeacher = await prisma.teacher.create({
      data: {
        nip: "197001012000011001",
        name: "Wakil Kepala Kurikulum",
        email: defaultTeacherEmail,
        status: "active",
      }
    });

    await prisma.user.update({
      where: { id: defaultTeacherUser.id },
      data: { teacherId: defaultTeacher.id }
    });
    console.log("✅ Akun Wakil Kepala Kurikulum berhasil dibuat");
  }

  const defaultSubjects = [
    { code: "PAI", name: "Pendidikan Agama dan Budi Pekerti", gradeLevel: 7, hoursPerWeek: 3 },
    { code: "PPKN", name: "Pendidikan Pancasila", gradeLevel: 7, hoursPerWeek: 3 },
    { code: "BIN", name: "Bahasa Indonesia", gradeLevel: 7, hoursPerWeek: 6 },
    { code: "MAT", name: "Matematika", gradeLevel: 7, hoursPerWeek: 5 },
    { code: "IPA", name: "Ilmu Pengetahuan Alam (IPA)", gradeLevel: 7, hoursPerWeek: 5 },
    { code: "IPS", name: "Ilmu Pengetahuan Sosial (IPS)", gradeLevel: 7, hoursPerWeek: 4 },
    { code: "BING", name: "Bahasa Inggris", gradeLevel: 7, hoursPerWeek: 4 },
    { code: "PJOK", name: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)", gradeLevel: 7, hoursPerWeek: 3 },
    { code: "TIK", name: "Informatika", gradeLevel: 7, hoursPerWeek: 2 },
    { code: "SBD", name: "Seni Budaya dan Prakarya", gradeLevel: 7, hoursPerWeek: 3 },
  ];

  for (const sub of defaultSubjects) {
    await prisma.subject.upsert({
      where: { code: sub.code },
      update: {},
      create: {
        ...sub,
        teacherId: defaultTeacher.id,
      }
    });
  }
  console.log("✅ Data Mata Pelajaran Default berhasil diinisialisasi");

  // 4. Inisialisasi Akun Siswa Test
  const studentEmail = "siswa@maleo.sch.id";
  const studentPassword = await bcrypt.hash("password", 10);

  const studentUser = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {
      password: studentPassword,
    },
    create: {
      name: "Siswa Test",
      email: studentEmail,
      password: studentPassword,
      role: "student",
      force_change_password: false,
      nipNis: "TEST001", // NIS untuk siswa
    },
  });

  // Buat class terlebih dahulu jika belum ada
  let testClass = await prisma.class.findFirst({
    where: { name: "7A" }
  });

  if (!testClass) {
    testClass = await prisma.class.create({
      data: {
        name: "7A",
        level: 7,
        homeroomTeacherId: defaultTeacher.id,
      }
    });
  }

  const student = await prisma.student.upsert({
    where: { nis: "TEST001" },
    update: {},
    create: {
      nis: "TEST001",
      name: "Siswa Test",
      classId: testClass.id,
      status: "active",
    },
  });

  await prisma.user.update({
    where: { id: studentUser.id },
    data: { studentId: student.id },
  });

  console.log(`✅ Siswa Test siap: ${student.nis}`);

  // 5. Inisialisasi Akun Wali Murid Test
  const guardianEmail = "wali@maleo.sch.id";
  const guardianPassword = await bcrypt.hash("password", 10);

  const guardian = await prisma.guardian.upsert({
    where: { email: guardianEmail },
    update: {},
    create: {
      name: "Wali Murid Test",
      email: guardianEmail,
    },
  });

  const guardianUser = await prisma.user.upsert({
    where: { email: guardianEmail },
    update: {
      password: guardianPassword,
    },
    create: {
      name: "Wali Murid Test",
      email: guardianEmail,
      password: guardianPassword,
      role: "guardian",
      force_change_password: false,
      guardianId: guardian.id,
    },
  });

  // Link guardian ke siswa
  await prisma.guardian.update({
    where: { id: guardian.id },
    data: {
      students: {
        connect: [{ id: student.id }]
      }
    }
  });

  console.log(`✅ Wali Murid Test siap: ${guardianUser.email}`);

  console.log("\n🎉 Database berhasil dibersihkan! Akun test tersedia:")
  console.log("   Admin:         admin@maleo.sch.id / password")
  console.log("   Kepala Sekolah: kepala@maleo.sch.id / password")
  console.log("   Guru:          kurikulum@maleo.sch.id / password")
  console.log("   Siswa:         siswa@maleo.sch.id / password (NIS: TEST001)")
  console.log("   Wali Murid:    wali@maleo.sch.id / password");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
