import { Request, Response, NextFunction } from "express";
/**
 * Middleware that trims and sanitizes string inputs in req.body.
 * Applied globally after express.json().
 */
export declare const sanitizeBody: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=sanitize.d.ts.map