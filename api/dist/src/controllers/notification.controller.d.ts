import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
/**
 * Mengambil maksimal 5 pengumuman terbaru berdasarkan role user login.
 */
export declare const getLatestNotifications: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=notification.controller.d.ts.map