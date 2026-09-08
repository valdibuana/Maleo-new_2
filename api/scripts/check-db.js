const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== USERS ===');
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true, teacherId: true, email: true, username: true, nipNis: true }
    });
    console.log(JSON.stringify(users, null, 2));

    console.log('\n=== TEACHERS ===');
    const teachers = await prisma.teacher.findMany({
      select: { 
        id: true, name: true, nip: true, status: true,
        user: { select: { id: true, name: true, teacherId: true } }
      }
    });
    console.log(JSON.stringify(teachers, null, 2));

    console.log('\n=== SUBJECTS ===');
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true, code: true, teacherId: true, gradeLevel: true }
    });
    console.log(JSON.stringify(subjects, null, 2));

    console.log('\n=== TEACHER_SUBJECTS ===');
    const teacherSubjects = await prisma.teacherSubject.findMany({
      select: { id: true, teacherId: true, subjectId: true, isPrimary: true }
    });
    console.log(JSON.stringify(teacherSubjects, null, 2));

    console.log('\n=== JOURNALS ===');
    const journals = await prisma.teacherJournal.findMany({
      include: {
        teacher: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      }
    });
    console.log(JSON.stringify(journals, null, 2));

  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('CODE:', e.code);
    console.error('META:', JSON.stringify(e.meta, null, 2));
    console.error('STACK:', e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
