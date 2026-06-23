import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teacher7User = await prisma.user.findFirst({
      where: { teacherId: 7 }
  });
  console.log("Teacher 7 User:", teacher7User);
  
  const teacher7Schedules = await prisma.schedule.findMany({
    where: { teacherId: 7 },
    include: { class: true }
  });
  console.log("Teacher 7 Schedules:", teacher7Schedules);
  
  const teacher7Homeroom = await prisma.class.findMany({
      where: { homeroomTeacherId: 7 }
  });
  console.log("Teacher 7 Homeroom:", teacher7Homeroom);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
