"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function updatePasswords() {
    const users = await prisma.user.findMany({ where: { force_change_password: true } });
    for (const u of users) {
        if (u.userCode && u.role !== 'admin') {
            const hashedPassword = await bcryptjs_1.default.hash(u.userCode, 10);
            await prisma.user.update({
                where: { id: u.id },
                data: { password: hashedPassword }
            });
            console.log('Updated password for', u.name, 'to', u.userCode);
        }
    }
}
updatePasswords().then(() => console.log('Done')).catch(console.error);
//# sourceMappingURL=update-passwords.js.map