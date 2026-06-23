"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = void 0;
/**
 * Middleware factory untuk membatasi akses berdasarkan role pengguna.
 *
 * Menerima satu atau lebih Role dari Prisma enum sehingga type-safe.
 * Harus digunakan SETELAH middleware `verifyJWT`.
 *
 * @example
 * // Hanya guru yang boleh mengakses
 * router.post("/", verifyJWT, checkRole("teacher"), handler);
 *
 * // Siswa dan orang tua boleh mengakses
 * router.get("/", verifyJWT, checkRole("student", "guardian"), handler);
 *
 * // Admin saja
 * router.delete("/:id", verifyJWT, checkRole("admin"), handler);
 */
const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        // Pastikan user sudah terautentikasi (verifyJWT harus dipanggil sebelumnya)
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Autentikasi diperlukan. Silakan login terlebih dahulu.",
            });
            return;
        }
        // Periksa apakah role user termasuk dalam daftar yang diizinkan
        const userRole = req.user.role;
        if (!allowedRoles.includes(userRole)) {
            res.status(403).json({
                success: false,
                message: `Akses ditolak. Role "${userRole}" tidak memiliki izin untuk mengakses resource ini.`,
                requiredRoles: allowedRoles,
            });
            return;
        }
        next();
    };
};
exports.checkRole = checkRole;
//# sourceMappingURL=role.js.map