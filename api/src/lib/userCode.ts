import { prisma } from "./prisma";
import { Role } from "@prisma/client";

/**
 * Menghasilkan 3 digit kode unik (000-999) yang belum digunakan oleh role tertentu.
 */
export async function generateUniqueUserCode(role: Role): Promise<string> {
  let isUnique = false;
  let code = "";

  while (!isUnique) {
    // Generate angka acak 3 digit
    const randomNum = Math.floor(Math.random() * 1000);
    code = String(randomNum).padStart(3, "0");

    // Cek di database apakah sudah ada user dengan role & code tersebut
    const existing = await prisma.user.findFirst({
      where: {
        role,
        userCode: code,
      },
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return code;
}
