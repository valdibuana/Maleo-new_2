import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
/**
 * Middleware to authorize LMS access.
 * Only teacher, student, and guardian roles are allowed.
 * kepala_sekolah is explicitly blocked.
 */
export declare const authorizeLMS: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=lms-guard.d.ts.map