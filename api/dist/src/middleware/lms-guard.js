"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeLMS = void 0;
/**
 * Middleware to authorize LMS access.
 * Only teacher, student, and guardian roles are allowed.
 * kepala_sekolah is explicitly blocked.
 */
const authorizeLMS = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Autentikasi diperlukan. Silakan login terlebih dahulu.",
        });
        return;
    }
    const allowedRoles = ["teacher", "student", "guardian", "admin"];
    const userRole = req.user.role;
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
exports.authorizeLMS = authorizeLMS;
//# sourceMappingURL=lms-guard.js.map