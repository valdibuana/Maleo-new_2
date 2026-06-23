const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const q1 = await prisma.$queryRaw`
    SELECT level, COUNT(*) as jumlah_kelas FROM classes
    GROUP BY level ORDER BY level;
  `;
  console.log("Query 1:", q1);

  const q2 = await prisma.$queryRaw`
    SELECT c.level, COUNT(a.id) as jumlah_record FROM attendances a
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    GROUP BY c.level ORDER BY c.level;
  `;
  console.log("Query 2:", q2);
}
main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
