import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.teacher.findFirst({
    where: { name: { contains: "Tinuk" } },
    include: {
      subjects: true,
      teacherSubjects: { include: { subject: true } },
      schedules: { include: { class: true } },
      homeroomClasses: true
    }
  });

  console.dir(teacher, { depth: null });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
