import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanTestData() {
  // Identifikasi test accounts berdasarkan seed.ts
  const testEmails = [
    "admin@maleo.sch.id",
    "kepala@maleo.sch.id",
    "kurikulum@maleo.sch.id",
    "siswa@maleo.sch.id",
    "wali@maleo.sch.id",
  ];

  console.log("Memeriksa akun test...\n");

  for (const email of testEmails) {
    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, name: true, email: true, role: true },
    });

    if (user) {
      console.log(`⚠️  Ditemukan: ${user.email} (${user.name}) — role: ${user.role}`);
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`✓ Hapus akun test: ${email}`);
    } else {
      console.log(`- Tidak ditemukan: ${email}`);
    }
  }

  console.log("\nSelesai. Semua akun test telah dihapus.");
}

cleanTestData()
  .then(() => {
    console.log("\n✅ Done.");
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });