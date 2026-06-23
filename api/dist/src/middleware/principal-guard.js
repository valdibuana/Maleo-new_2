"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readOnlyKepalaSekolah = void 0;
/**
 * Middleware untuk memblokir aksi mutasi (POST, PUT, DELETE)
 * khusus untuk role KEPALA_SEKOLAH.
 */
const readOnlyKepalaSekolah = (req, res, next) => {
    // Pastikan user sudah terautentikasi
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Autentikasi diperlukan."
        });
    }
    const role = req.user.role.toLowerCase();
    // Jika login sebagai KEPALA_SEKOLAH dan metodenya bukan GET
    if ((role === "kepala_sekolah" || role === "principal") &&
        req.method !== "GET") {
        // Kecualikan route export jika ada
        if (!req.originalUrl.toLowerCase().includes("/export")) {
            return res.status(403).json({
                success: false,
                message: "Kepala sekolah hanya memiliki akses read-only"
            });
        }
    }
    next();
};
exports.readOnlyKepalaSekolah = readOnlyKepalaSekolah;
//# sourceMappingURL=principal-guard.js.map