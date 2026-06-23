import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
/**
 * Middleware untuk memblokir aksi mutasi (POST, PUT, DELETE)
 * khusus untuk role KEPALA_SEKOLAH.
 */
export declare const readOnlyKepalaSekolah: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=principal-guard.d.ts.map