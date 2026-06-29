import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateTokenId,
  hashToken,
} from "../lib/jwt";
import { validate } from "../middleware/validate";
import { verifyJWT, AuthRequest } from "../middleware/auth";
import { authLimiter } from "../middleware/rate-limit";

const router = Router();

// ──────────────────────────────────────────────
// Validation Schemas
// ──────────────────────────────────────────────

const loginSchema = z.object({
  identifier: z.string().min(1, "Email / NIS / NIP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  newPassword: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar")
    .regex(/[0-9]/, "Password harus mengandung minimal 1 angka"),
});

// ──────────────────────────────────────────────
// POST /api/auth/login
// Menerima email & password, mengembalikan JWT + data user beserta role
// Refresh token disimpan ke database dengan hash untuk rotation tracking
// ──────────────────────────────────────────────
router.post("/login", authLimiter, validate(loginSchema), async (req, res: Response) => {
  try {
    const { identifier, password } = req.body as z.infer<typeof loginSchema>;

    // Normalize identifier
    const normalizedIdentifier = identifier.toLowerCase().trim();

    // Cari user dengan semua identifier
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { userCode: { equals: identifier, mode: 'insensitive' } },
          { username: normalizedIdentifier },
          { email: { equals: identifier, mode: 'insensitive' } },
          { nipNis: identifier },
        ]
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: "Kredensial login salah" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: "Kredensial login salah" });
      return;
    }

    // Generate access token
    const token = signAccessToken({ id: user.id, role: user.role });

    // Refresh Token Rotation: Simpan ke database
    const tokenId = generateTokenId();
    const familyId = tokenId; // familyId = jti untuk token pertama
    const refreshToken = signRefreshToken({ id: user.id, role: user.role }, tokenId);
    const tokenHash = hashToken(refreshToken);

    const refreshExpiryMs = parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || "30d");
    const expiresAt = new Date(Date.now() + refreshExpiryMs);

    await prisma.refreshToken.create({
      data: { token: tokenHash, familyId, userId: user.id, expiresAt },
    });

    res.json({
      success: true,
      message: "Login berhasil",
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          nipNis: user.nipNis,
          username: user.username,
          role: user.role,
          force_change_password: user.force_change_password,
        },
      },
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server. Silakan coba lagi nanti.",
    });
  }
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token wajib diisi"),
});

// ──────────────────────────────────────────────
// GET /api/auth/me
// Mengambil data user yang sedang login berdasarkan JWT token
// ──────────────────────────────────────────────
router.get("/me", verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        force_change_password: true,
        createdAt: true,
        teacher: {
          select: {
            id: true,
            subjects: { select: { id: true, name: true, code: true } },
            homeroomClasses: { select: { id: true, name: true, level: true } }
          }
        },
        student: {
          select: {
            id: true,
            class: { select: { id: true, name: true } }
          }
        },
        guardian: {
          select: {
            id: true,
            students: {
              select: {
                id: true,
                name: true,
                class: { select: { id: true, name: true } }
              }
            }
          }
        }
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User tidak ditemukan" });
      return;
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error("[Auth] Me error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
});
// ──────────────────────────────────────────────
// PUT /api/auth/change-password
// Mengubah password user yang sedang login + revoke semua refresh token
// ──────────────────────────────────────────────
router.put(
  "/change-password",
  verifyJWT,
  validate(changePasswordSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;

      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

      if (!user) {
        res.status(404).json({ success: false, message: "User tidak ditemukan" });
        return;
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        res.status(400).json({ success: false, message: "Password lama tidak sesuai" });
        return;
      }

      if (currentPassword === newPassword) {
        res.status(400).json({ success: false, message: "Password baru tidak boleh sama dengan password lama" });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Transaction: update password + revoke all refresh tokens
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword, force_change_password: false },
        }),
        prisma.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      res.json({
        success: true,
        message: "Password berhasil diubah. Semua perangkat akan logout.",
      });
    } catch (error) {
      console.error("[Auth] Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server. Silakan coba lagi nanti.",
      });
    }
  }
);
// ──────────────────────────────────────────────
// POST /api/auth/forgot-password
// User lupa password - verifikasi default password sistem, lalu set password baru
// + Revoke all refresh tokens
// ──────────────────────────────────────────────
router.post(
  "/forgot-password",
  authLimiter,
  validate(
    z.object({
      identifier: z.string().min(1, "Email / NIS / NIP wajib diisi"),
      defaultPassword: z.string().min(1, "Password default wajib diisi"),
      newPassword: z
        .string()
        .min(8, "Password minimal 8 karakter")
        .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar")
        .regex(/[0-9]/, "Password harus mengandung minimal 1 angka"),
    })
  ),
  async (req, res: Response) => {
    try {
      const { identifier, defaultPassword, newPassword } = req.body;

      const normalizedIdentifier = identifier.toLowerCase().trim();

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { userCode: { equals: identifier, mode: 'insensitive' } },
            { username: normalizedIdentifier },
            { email: { equals: identifier, mode: 'insensitive' } },
            { nipNis: identifier },
          ],
        },
      });

      if (!user) {
        res.status(404).json({ success: false, message: "User tidak ditemukan" });
        return;
      }

      if (user.role === "admin") {
        res.status(403).json({ success: false, message: "Fitur ini tidak tersedia untuk akun admin" });
        return;
      }

      if (!user.userCode) {
        res.status(400).json({ success: false, message: "Akun ini tidak memiliki Kode Login. Hubungi administrator." });
        return;
      }

      const rolePrefixMap: Record<string, string> = {
        teacher: "G", student: "S", guardian: "O", kepala_sekolah: "K",
      };

      const prefix = rolePrefixMap[user.role];
      if (!prefix) {
        res.status(400).json({ success: false, message: "Role tidak didukung untuk fitur ini" });
        return;
      }

      const expectedDefaultPassword = user.userCode.startsWith(prefix)
        ? user.userCode
        : prefix + user.userCode;

      if (defaultPassword !== expectedDefaultPassword) {
        res.status(400).json({ success: false, message: "Password default sistem tidak sesuai" });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Transaction: update password + revoke all tokens
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword, force_change_password: false },
        }),
        prisma.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      res.json({ success: true, message: "Password berhasil diubah. Silakan login dengan password baru." });
    } catch (error) {
      console.error("[Auth] Forgot password error:", error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan server. Silakan coba lagi nanti." });
    }
  }
);
// ──────────────────────────────────────────────
// POST /api/auth/refresh
// REFRESH TOKEN ROTATION dengan REUSE DETECTION
//   1. Verifikasi JWT signature & jti
//   2. Cari token_hash di database - harus ADA dan BELUM di-revoke
//   3. Jika tidak ditemukan atau sudah di-revoke -> REUSE DETECTION
//      -> revoke semua token dalam family (force logout)
//   4. Jika valid -> rotate: revoke yang lama, create yang baru (family_id tetap)
// ──────────────────────────────────────────────
router.post("/refresh", validate(refreshSchema), async (req, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Step 1: Verify JWT signature
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (jwtError) {
      const isExpired = jwtError instanceof Error && jwtError.name === "TokenExpiredError";
      res.status(401).json({
        success: false,
        code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
        message: isExpired ? "Sesi telah berakhir. Silakan login kembali." : "Refresh token tidak valid.",
      });
      return;
    }

    if (payload.tokenType && payload.tokenType !== "refresh") {
      res.status(401).json({ success: false, code: "INVALID_TOKEN_TYPE", message: "Jenis token tidak valid." });
      return;
    }

    const tokenHash = hashToken(refreshToken);
    const jti = payload.jti;

    if (!jti) {
      res.status(401).json({ success: false, code: "OLD_TOKEN_FORMAT", message: "Sesi lama tidak didukung. Silakan login kembali." });
      return;
    }

    // Step 2: Look up in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      select: { id: true, familyId: true, revokedAt: true, userId: true },
    });

    // Step 3: Reuse Detection
    if (!storedToken || storedToken.revokedAt !== null) {
      if (storedToken?.familyId) {
        await prisma.refreshToken.updateMany({
          where: { familyId: storedToken.familyId },
          data: { revokedAt: new Date() },
        });
        console.warn(`[SECURITY] Refresh token reuse detected! Family ${storedToken.familyId} revoked.`);
      }
      res.status(401).json({
        success: false,
        code: "TOKEN_REUSE_DETECTED",
        message: "Token sudah tidak berlaku. Silakan login kembali.",
      });
      return;
    }

    // Step 4: Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
      select: { id: true, name: true, email: true, nipNis: true, username: true, role: true, force_change_password: true },
    });

    if (!user) {
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revokedAt: new Date() },
      });
      res.status(401).json({ success: false, code: "USER_NOT_FOUND", message: "Sesi tidak valid. Silakan login kembali." });
      return;
    }

    // Step 5: Rotate token
    const newTokenId = generateTokenId();
    const newRefreshToken = signRefreshToken({ id: user.id, role: user.role }, newTokenId);
    const newTokenHash = hashToken(newRefreshToken);
    const refreshExpiryMs = parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || "30d");
    const expiresAt = new Date(Date.now() + refreshExpiryMs);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: { token: newTokenHash, familyId: storedToken.familyId, userId: user.id, expiresAt },
      }),
    ]);

    const nextAccessToken = signAccessToken({ id: user.id, role: user.role });

    res.json({
      success: true,
      message: "Token berhasil diperbarui",
      data: { token: nextAccessToken, refreshToken: newRefreshToken, user },
    });
  } catch (error) {
    console.error("[Auth] Refresh error:", error);
    res.status(401).json({
      success: false,
      code: "REFRESH_FAILED",
      message: "Gagal memperbarui token. Silakan login kembali.",
    });
  }
});
// ──────────────────────────────────────────────
// POST /api/auth/logout
// Revoke semua refresh token milik user yang sedang login
// ──────────────────────────────────────────────
router.post("/logout", verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    console.log(`[Auth] User ${userId} logout - revoked ${result.count} refresh token(s)`);

    res.json({ success: true, message: "Logout berhasil" });
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server. Silakan coba lagi nanti." });
  }
});

// ──────────────────────────────────────────────
// Helper: Parse duration string to milliseconds
// Supports formats: "30d", "12h", "45m", "7d"
// ──────────────────────────────────────────────
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)\s*(d|h|m|s)?$/i);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = (match[2] || "d").toLowerCase();
  switch (unit) {
    case "d": return value * 24 * 60 * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "m": return value * 60 * 1000;
    case "s": return value * 1000;
    default: return value * 24 * 60 * 60 * 1000;
  }
}

export default router;