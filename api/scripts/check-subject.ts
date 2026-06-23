import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const subjects = await prisma.subject.findMany({
    where: { name: { contains: "Literasi" } },
    include: { teacher: true }
  });
  console.dir(subjects, { depth: null });
  
  const tinukUser = await prisma.user.findFirst({
      where: { teacher: { name: { contains: "Tinuk" } } }
  });
  console.log("Tinuk User:", tinukUser);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
