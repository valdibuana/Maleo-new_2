import { Role } from "@prisma/client";
/**
 * Menghasilkan 3 digit kode unik (000-999) yang belum digunakan oleh role tertentu.
 */
export declare function generateUniqueUserCode(role: Role): Promise<string>;
//# sourceMappingURL=userCode.d.ts.map