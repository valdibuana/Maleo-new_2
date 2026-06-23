import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const updatedCount = await prisma.$executeRawUnsafe(
    `UPDATE users SET role = 'admin' WHERE role = 'super_admin'`
  )
  console.log(`Updated ${updatedCount} users from super_admin to admin`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
