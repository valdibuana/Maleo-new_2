
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function getUniqueNip() {
  while (true) {
    const nip = Math.floor(1000 + Math.random() * 9000).toString();
    const existing = await prisma.user.findUnique({ where: { nipNis: nip } });
    if (!existing) return nip;
  }
}

async function fixData() {
  // Fix Teacher NIPs
  const teachers = await prisma.teacher.findMany();
  for (const t of teachers) {
    if (!/^\d{4}$/.test(t.nip)) {
      let newNip = t.nip.replace(/\D/g, ''); // strip non-digits
      if (newNip.length > 4) newNip = newNip.substring(0, 4);
      else if (newNip.length > 0 && newNip.length < 4) newNip = newNip.padStart(4, '0');
      
      if (t.nip === '000000000') newNip = '0000';

      // Check if newNip is actually unique
      if (newNip.length === 4) {
        const existing = await prisma.user.findFirst({ where: { nipNis: newNip, NOT: { teacherId: t.id } } });
        if (existing) newNip = await getUniqueNip();
      } else {
        newNip = await getUniqueNip();
      }
      
      // Update Teacher
      await prisma.teacher.update({ where: { id: t.id }, data: { nip: newNip } });
      // Update corresponding User nipNis
      await prisma.user.updateMany({ where: { teacherId: t.id }, data: { nipNis: newNip } });
      console.log(`Updated Teacher ${t.name}: ${t.nip} -> ${newNip}`);
    }
  }

  // Fix Principal NIPs
  const principals = await prisma.principal.findMany();
  for (const p of principals) {
    if (!/^\d{4}$/.test(p.nip)) {
      let newNip = p.nip.replace(/\D/g, '');
      if (newNip.length > 4) newNip = newNip.substring(0, 4);
      else if (newNip.length > 0 && newNip.length < 4) newNip = newNip.padStart(4, '0');

      if (newNip.length === 4) {
        const existing = await prisma.user.findFirst({ where: { nipNis: newNip, NOT: { principalId: p.id } } });
        if (existing) newNip = await getUniqueNip();
      } else {
        newNip = await getUniqueNip();
      }

      await prisma.principal.update({ where: { id: p.id }, data: { nip: newNip } });
      await prisma.user.updateMany({ where: { principalId: p.id }, data: { nipNis: newNip } });
      console.log(`Updated Principal ${p.name}: ${p.nip} -> ${newNip}`);
    }
  }

  // Fix User userCode
  const users = await prisma.user.findMany();
  for (const u of users) {
    if (u.userCode && /^\d{3}$/.test(u.userCode)) {
      let prefix = '';
      if (u.role === 'teacher') prefix = 'G';
      else if (u.role === 'student') prefix = 'S';
      else if (u.role === 'guardian') prefix = 'O';
      else if (u.role === 'kepala_sekolah') prefix = 'K';
      
      if (prefix) {
        const newCode = prefix + u.userCode;
        
        let updateData: any = { userCode: newCode };
        
        // Update default password if force_change_password is true
        if (u.force_change_password) {
           let defPass = '';
           if (u.role === 'teacher' || u.role === 'kepala_sekolah' || u.role === 'student' || u.role === 'guardian') {
             defPass = newCode;
           }
           if (defPass) {
             updateData.password = await bcrypt.hash(defPass, 10);
           }
        }
        
        await prisma.user.update({ where: { id: u.id }, data: updateData });
        console.log(`Updated User ${u.name} code: ${u.userCode} -> ${newCode}`);
      }
    }
  }
}
fixData().then(() => console.log('Done')).catch(console.error);
