import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { Role } from "@prisma/client";

/**
 * Middleware to authorize LMS access.
 * Only teacher, student, and guardian roles are allowed.
 * kepala_sekolah is explicitly blocked.
 */
export const authorizeLMS = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Autentikasi diperlukan. Silakan login terlebih dahulu.",
    });
    return;
  }

  const allowedRoles: Role[] = ["teacher", "student", "guardian", "admin"];
  const userRole = req.user.role as Role;

  if (userRole === "kepala_sekolah") {
    res.status(403).json({
      success: false,
      message: "Akses LMS ditolak",
    });
    return;
  }

  if (!allowedRoles.includes(userRole)) {
    res.status(403).json({
      success: false,
      message: "Akses ditolak. Anda tidak memiliki izin untuk mengakses LMS.",
    });
    return;
  }

  next();
};
