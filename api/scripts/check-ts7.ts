import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teacherSubjects = await prisma.teacherSubject.findMany({
      where: { teacherId: 7 },
      include: { subject: true }
  });
  console.log("Teacher 7 TeacherSubjects:", teacherSubjects);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
