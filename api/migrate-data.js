const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');
  
  // Create enum values if they don't exist by altering the type directly
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "ScoreType" ADD VALUE IF NOT EXISTS 'PSTS'`);
    console.log('Added PSTS to ScoreType enum');
  } catch (e) {
    console.log('PSTS might already exist or error:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "ScoreType" ADD VALUE IF NOT EXISTS 'PSAS'`);
    console.log('Added PSAS to ScoreType enum');
  } catch (e) {
    console.log('PSAS might already exist or error:', e.message);
  }
  
  // Update the data
  const res1 = await prisma.$executeRawUnsafe(`UPDATE grades SET type = 'PSTS' WHERE type = 'UTS'`);
  console.log(`Updated ${res1} UTS to PSTS`);
  
  const res2 = await prisma.$executeRawUnsafe(`UPDATE grades SET type = 'PSAS' WHERE type = 'UAS'`);
  console.log(`Updated ${res2} UAS to PSAS`);
  
  console.log('Data migration complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
