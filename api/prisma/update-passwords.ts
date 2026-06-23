import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function updatePasswords() {
  const users = await prisma.user.findMany({ where: { force_change_password: true } });
  for (const u of users) {
    if (u.userCode && u.role !== 'admin') {
      const hashedPassword = await bcrypt.hash(u.userCode, 10);
      await prisma.user.update({
        where: { id: u.id },
        data: { password: hashedPassword }
      });
      console.log('Updated password for', u.name, 'to', u.userCode);
    }
  }
}

updatePasswords().then(() => console.log('Done')).catch(console.error);
