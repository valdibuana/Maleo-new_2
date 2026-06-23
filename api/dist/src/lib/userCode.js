"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueUserCode = generateUniqueUserCode;
const prisma_1 = require("./prisma");
/**
 * Menghasilkan 3 digit kode unik (000-999) yang belum digunakan oleh role tertentu.
 */
async function generateUniqueUserCode(role) {
    let isUnique = false;
    let code = "";
    while (!isUnique) {
        // Generate angka acak 3 digit
        const randomNum = Math.floor(Math.random() * 1000);
        code = String(randomNum).padStart(3, "0");
        // Cek di database apakah sudah ada user dengan role & code tersebut
        const existing = await prisma_1.prisma.user.findFirst({
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
//# sourceMappingURL=userCode.js.map