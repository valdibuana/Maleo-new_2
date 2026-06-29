# PLANNING PERBAIKAN ARSITEKTUR SIAKAD MALEO
**Versi:** 1.0  
**Dibuat:** 29 Juni 2026  
**Berdasarkan:** AUDIT_LENGKAP.md (Architecture Score: 3/10 → Target: 8/10)

---

## DAFTAR ISI
1. [Target Arsitektur Baru](#1-target-arsitektur-baru)
2. [Struktur Folder Baru](#2-struktur-folder-baru)
3. [Phase 1: Foundation (Minggu 1-2)](#3-phase-1-foundation-minggu-1-2)
4. [Phase 2: Service Layer (Minggu 3-4)](#4-phase-2-service-layer-minggu-3-4)
5. [Phase 3: Security & Performance (Minggu 5-6)](#5-phase-3-security--performance-minggu-5-6)
6. [Phase 4: Scalability (Minggu 7-8)](#6-phase-4-scalability-minggu-7-8)
7. [Phase 5: Frontend Refactor (Minggu 9-10)](#7-phase-5-frontend-refactor-minggu-9-10)
8. [Phase 6: Production Hardening (Minggu 11-12)](#8-phase-6-production-hardening-minggu-11-12)
9. [Kode Contoh Lengkap](#9-kode-contoh-lengkap)
10. [Database Migration Plan](#10-database-migration-plan)
11. [Docker Improvement Plan](#11-docker-improvement-plan)
12. [Timeline & Milestone](#12-timeline--milestone)

---

## 1. TARGET ARSITEKTUR BARU

### Arsitektur Saat Ini (Monolithic God Controller)
```
Client → Route Handler (logic + DB query + validation + response)
```

### Arsitektur Target (Layered Architecture)
```
Client → Route (routing only) → Controller (validation + response) → Service (business logic) → Repository (DB query) → Prisma
```

### Layer Diagram
```
┌──────────────────────────────────────────────────┐
│                   CLIENT                          │
│         (Next.js Frontend + Axios)                │
└────────────────────┬─────────────────────────────┘
                     │ HTTP Request
                     ▼
┌──────────────────────────────────────────────────┐
│              ROUTE LAYER (routing only)           │
│  - Defines path + middleware chain                │
│  - No business logic                              │
│  - File: *.route.ts (10-20 baris)                 │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│            CONTROLLER LAYER                       │
│  - Validates request (Zod)                        │
│  - Calls service                                  │
│  - Formats response                               │
│  - Handles HTTP-specific concerns                 │
│  - File: *.controller.ts (30-50 baris)            │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│             SERVICE LAYER (Business Logic)        │
│  - All business rules                             │
│  - Ownership verification                         │
│  - Transaction management                         │
│  - Calls repository layer                         │
│  - Throws AppError (NOT res.status)               │
│  - File: *.service.ts (50-200 baris)              │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│           REPOSITORY LAYER (Data Access)          │
│  - Prisma queries only                            │
│  - No business logic                              │
│  - Reusable query builders                        │
│  - File: *.repository.ts (30-100 baris)           │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│              PRISMA ORM + PostgreSQL              │
└──────────────────────────────────────────────────┘
```

---

## 2. STRUKTUR FOLDER BARU

### Struktur Backend Target
```
api/src/
├── index.ts                    # Entry point (app setup + middleware + routes)
├── config/
│   ├── env.ts                  # Environment validation & export
│   └── constants.ts            # App constants
│
├── middleware/
│   ├── auth.ts                 # JWT verification (EXISTING)
│   ├── role.ts                 # Role check (EXISTING)
│   ├── ownership.ts            # NEW: Ownership verification middleware
│   ├── validate.ts             # Zod validation (EXISTING)
│   ├── rate-limit.ts           # Rate limiting (EXISTING - IMPROVED)
│   ├── sanitize.ts             # XSS sanitization (EXISTING)
│   ├── logger.ts               # Request logging (EXISTING)
│   └── error-handler.ts        # NEW: Centralized error handler
│
├── routes/
│   ├── index.ts                # NEW: Route aggregator
│   ├── auth.route.ts           # REFACTORED: 15 lines max
│   ├── students.route.ts       # REFACTORED: 20 lines max
│   ├── teachers.route.ts       # REFACTORED
│   ├── guardians.route.ts      # REFACTORED
│   ├── academic-years.route.ts
│   ├── classes.route.ts
│   ├── subjects.route.ts
│   ├── schedules.route.ts
│   ├── attendances.route.ts    # REFACTORED
│   ├── grades.route.ts
│   ├── announcements.route.ts
│   ├── users.route.ts
│   ├── dashboard.route.ts
│   ├── lms.route.ts
│   ├── atp.route.ts
│   └── principal.route.ts     # REFACTORED (biggest offender)
│
├── controllers/
│   ├── auth.controller.ts      # NEW
│   ├── student.controller.ts   # NEW
│   ├── teacher.controller.ts   # NEW
│   ├── attendance.controller.ts # NEW
│   ├── principal.controller.ts # NEW: Dashboard logic
│   ├── lms.controller.ts       # MOVE from current lms.controller.ts
│   └── grade.controller.ts     # NEW
│
├── services/
│   ├── auth.service.ts         # NEW: login, refresh, logout, changePassword
│   ├── student.service.ts      # NEW: CRUD, import, export
│   ├── teacher.service.ts      # NEW: CRUD, subject assignment
│   ├── attendance.service.ts   # NEW: bulk create, getByClass, export
│   ├── grade.service.ts        # NEW: CRUD, calculation
│   ├── principal.service.ts    # NEW: dashboard aggregation
│   ├── lms.service.ts          # NEW: modules, sessions, materials
│   ├── dashboard.service.ts    # NEW: role-based dashboard data
│   ├── user.service.ts         # NEW: user management
│   └── notification.service.ts # NEW: notifications
│
├── repositories/
│   ├── student.repository.ts   # NEW: Prisma queries for student
│   ├── teacher.repository.ts   # NEW
│   ├── attendance.repository.ts # NEW
│   ├── grade.repository.ts     # NEW
│   ├── user.repository.ts      # NEW
│   ├── class.repository.ts     # NEW
│   ├── subject.repository.ts   # NEW
│   └── lms.repository.ts       # NEW
│
├── lib/
│   ├── prisma.ts               # Prisma client (EXISTING)
│   ├── jwt.ts                  # JWT functions (EXISTING)
│   ├── errors.ts               # Custom error classes (EXISTING)
│   ├── pagination.ts           # Pagination helpers (EXISTING)
│   ├── fields.ts               # Field selection (EXISTING)
│   ├── roles.ts                # Role constants (EXISTING)
│   ├── userCode.ts             # User code generation (EXISTING)
│   └── response.ts             # NEW: Standard response builder
│
├── types/
│   ├── index.ts                # NEW: Shared types
│   ├── auth.types.ts           # NEW: Auth-related types
│   └── service.types.ts        # NEW: Service input/output types
│
├── utils/
│   ├── logger.ts               # NEW: Winston/Pino logger (replace console.log)
│   └── date.ts                 # NEW: Date utility functions
│
└── prisma/
    ├── schema.prisma           # EXISTING (dengan index tambahan)
    └── seed.ts                 # REFACTORED (production-safe)
```

### Struktur Frontend Target
```
web/src/
├── services/
│   ├── apiService.ts           # REFACTORED: Gunakan TanStack Query
│   └── queryClient.ts          # NEW: Query client config
│
├── hooks/
│   ├── useAuth.ts              # NEW: Auth hook (access token di memory)
│   ├── useStudents.ts          # NEW: React Query hooks
│   ├── useTeachers.ts          # NEW
│   ├── useAttendances.ts       # NEW
│   └── useGrades.ts            # NEW
│
├── lib/
│   ├── axios.ts                # REFACTORED: HttpOnly cookie, no localStorage
│   └── auth-utils.ts           # REFACTORED: Memory-only token storage
│
└── components/
    └── providers/
        └── AuthProvider.tsx     # NEW: Context provider for auth state
```

---

## 3. PHASE 1: FOUNDATION (Minggu 1-2)

### Target: Membangun infrastruktur dasar tanpa mengubah fungsionalitas

#### Task 1.1: Buat Response Helper
**File:** `api/src/lib/response.ts`
```typescript
import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  errors?: any;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200) {
  const response: ApiResponse<T> = { success: true, data };
  if (message) response.message = message;
  return res.status(statusCode).json(response);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number }
) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}

export function sendError(res: Response, statusCode: number, message: string, details?: any) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
}
```

#### Task 1.2: Buat Error Handler Terpusat
**File:** `api/src/middleware/error-handler.ts`
```typescript
import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { logger } from "../utils/logger";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Zod validation errors from middleware
  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: "Validasi gagal",
      errors: err.flatten().fieldErrors,
    });
  }

  // Multer errors
  if (err instanceof Error && err.message.includes("File type not supported")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "Ukuran file terlalu besar. Maksimal 20MB." });
  }

  // Prisma errors
  if (err.code === "P2002") {
    return res.status(409).json({ success: false, message: "Data sudah ada di sistem." });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ success: false, message: "Data tidak ditemukan." });
  }

  // Unknown errors
  logger.error("[Unhandled Error]", err);
  return res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server.",
    ...(process.env.NODE_ENV === "development" ? { error: err.message } : {}),
  });
}
```

#### Task 1.3: Buat Logger Utility (ganti console.log)
**File:** `api/src/utils/logger.ts`
```typescript
// Sementara: simple wrapper, nanti upgrade ke Winston/Pino
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  error: (message: string, meta?: any) => {
    if (shouldLog("error")) console.error(formatMessage("error", message, meta));
  },
  warn: (message: string, meta?: any) => {
    if (shouldLog("warn")) console.warn(formatMessage("warn", message, meta));
  },
  info: (message: string, meta?: any) => {
    if (shouldLog("info")) console.log(formatMessage("info", message, meta));
  },
  debug: (message: string, meta?: any) => {
    if (shouldLog("debug")) console.log(formatMessage("debug", message, meta));
  },
};
```

#### Task 1.4: Buat Ownership Middleware
**File:** `api/src/middleware/ownership.ts`
```typescript
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { prisma } from "../lib/prisma";
import { sendError } from "../lib/response";

/**
 * Middleware untuk memverifikasi bahwa teacher hanya mengakses data miliknya.
 * Gunakan setelah verifyJWT.
 */
export const verifyTeacherOwnership = (modelName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const resourceId = Number(req.params.id);

      if (!userId) {
        sendError(res, 401, "Autentikasi diperlukan.");
        return;
      }

      // Cari teacher berdasarkan user ID
      const teacher = await prisma.teacher.findFirst({
        where: { user: { id: userId } },
        select: { id: true },
      });

      if (!teacher) {
        sendError(res, 403, "Profil guru tidak ditemukan.");
        return;
      }

      // Cek apakah resource milik teacher ini
      const modelMap: Record<string, string> = {
        atp: "teacherId",
        module: "teacherId",
        content: "teacherId",
        grade_config: "teacherId",
      };

      const fieldName = modelMap[modelName];
      if (!fieldName) {
        next(); // Skip jika model tidak terdaftar
        return;
      }

      const prismaModel = (prisma as any)[modelName];
      if (!prismaModel) {
        next();
        return;
      }

      const resource = await prismaModel.findUnique({
        where: { id: resourceId },
        select: { [fieldName]: true },
      });

      if (!resource) {
        sendError(res, 404, "Data tidak ditemukan.");
        return;
      }

      if (resource[fieldName] !== teacher.id) {
        sendError(res, 403, "Anda tidak memiliki akses ke data ini.");
        return;
      }

      next();
    } catch (error) {
      sendError(res, 500, "Terjadi kesalahan server.");
    }
  };
};

/**
 * Middleware untuk filter query berdasarkan role.
 * Tambahkan where clause otomatis untuk teacher/student/guardian.
 */
export function applyRoleFilter(role: string, userId: number) {
  switch (role) {
    case "teacher":
      return { teacher: { user: { id: userId } } };
    case "student":
      return { student: { user: { id: userId } } };
    default:
      return {};
  }
}
```

#### Task 1.5: Update index.ts dengan Error Handler Baru
**File:** `api/src/index.ts` (partial update)
```typescript
import { errorHandler } from "./middleware/error-handler";

// ... existing code ...

// Error Handler — centralized
app.use(errorHandler);

// Start
app.listen(PORT, () => {
  logger.info(`Maleo API running on http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});
```

---

## 4. PHASE 2: SERVICE LAYER (Minggu 3-4)

### Target: Refactor semua route handler ke Controller → Service → Repository pattern

#### Task 2.1: Buat Auth Service (Contoh Implementasi Lengkap)

**File:** `api/src/services/auth.service.ts`
```typescript
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken, generateTokenId, hashToken } from "../lib/jwt";
import { AppError } from "../lib/errors";
import { logger } from "../utils/logger";

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface LoginResult {
  token: string;
  refreshToken: string;
  user: {
    id: number;
    name: string;
    email: string | null;
    role: string;
    force_change_password: boolean;
  };
}

export class AuthService {
  /**
   * Login user with identifier (email/nis/nip/userCode) and password.
   * Implements refresh token rotation.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const { identifier, password } = input;
    const normalizedIdentifier = identifier.toLowerCase().trim();

    // Find user by any identifier
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
      throw new AppError(401, "Kredensial login salah");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, "Kredensial login salah");
    }

    // Generate tokens
    const token = signAccessToken({ id: user.id, role: user.role });
    const tokenId = generateTokenId();
    const familyId = tokenId;
    const refreshToken = signRefreshToken({ id: user.id, role: user.role }, tokenId);
    const tokenHash = hashToken(refreshToken);

    const refreshExpiryMs = this.parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || "30d");
    const expiresAt = new Date(Date.now() + refreshExpiryMs);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: { token: tokenHash, familyId, userId: user.id, expiresAt },
    });

    logger.info(`User ${user.id} logged in successfully`, { role: user.role });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        force_change_password: user.force_change_password,
      },
    };
  }

  /**
   * Refresh access token with rotation and reuse detection.
   */
  async refreshToken(refreshTokenStr: string): Promise<LoginResult> {
    // Verify JWT signature
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenStr);
    } catch (jwtError: any) {
      const isExpired = jwtError.name === "TokenExpiredError";
      throw new AppError(401, isExpired ? "Sesi telah berakhir." : "Refresh token tidak valid.", 
        isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID");
    }

    if (payload.tokenType && payload.tokenType !== "refresh") {
      throw new AppError(401, "Jenis token tidak valid.", "INVALID_TOKEN_TYPE");
    }

    const tokenHash = hashToken(refreshTokenStr);
    const jti = payload.jti;

    if (!jti) {
      throw new AppError(401, "Sesi lama tidak didukung. Silakan login kembali.", "OLD_TOKEN_FORMAT");
    }

    // Look up in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      select: { id: true, familyId: true, revokedAt: true, userId: true },
    });

    // Reuse Detection
    if (!storedToken || storedToken.revokedAt !== null) {
      if (storedToken?.familyId) {
        await prisma.refreshToken.updateMany({
          where: { familyId: storedToken.familyId },
          data: { revokedAt: new Date() },
        });
        logger.warn(`Refresh token reuse detected! Family ${storedToken.familyId} revoked.`);
      }
      throw new AppError(401, "Token sudah tidak berlaku. Silakan login kembali.", "TOKEN_REUSE_DETECTED");
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
      select: { id: true, name: true, email: true, role: true, force_change_password: true },
    });

    if (!user) {
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revokedAt: new Date() },
      });
      throw new AppError(401, "Sesi tidak valid.", "USER_NOT_FOUND");
    }

    // Rotate token
    const newTokenId = generateTokenId();
    const newRefreshToken = signRefreshToken({ id: user.id, role: user.role }, newTokenId);
    const newTokenHash = hashToken(newRefreshToken);
    const refreshExpiryMs = this.parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || "30d");
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

    return {
      token: nextAccessToken,
      refreshToken: newRefreshToken,
      user,
    };
  }

  /**
   * Change password and revoke all refresh tokens.
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, "User tidak ditemukan");

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) throw new AppError(400, "Password lama tidak sesuai");

    if (currentPassword === newPassword) {
      throw new AppError(400, "Password baru tidak boleh sama dengan password lama");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword, force_change_password: false },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    logger.info(`Password changed for user ${userId}`);
  }

  /**
   * Logout: revoke all active refresh tokens.
   */
  async logout(userId: number): Promise<void> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.info(`User ${userId} logged out - revoked ${result.count} refresh token(s)`);
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)\s*(d|h|m|s)?$/i);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = (match[2] || "d").toLowerCase();
    const multipliers: Record<string, number> = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 60 * 1000,
      s: 1000,
    };
    return value * (multipliers[unit] || multipliers.d);
  }
}

export const authService = new AuthService();
```

#### Task 2.2: Buat Auth Controller

**File:** `api/src/controllers/auth.controller.ts`
```typescript
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { authService } from "../services/auth.service";
import { sendSuccess, sendError } from "../lib/response";
import { logger } from "../utils/logger";

export class AuthController {
  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { identifier, password } = req.body;
      const result = await authService.login({ identifier, password });
      sendSuccess(res, result, "Login berhasil");
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
      } else {
        logger.error("[Auth] Login error:", error);
        sendError(res, 500, "Terjadi kesalahan server.");
      }
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user!.id);
      sendSuccess(res, { user });
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
      } else {
        logger.error("[Auth] Me error:", error);
        sendError(res, 500, "Terjadi kesalahan server.");
      }
    }
  }

  async refresh(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      sendSuccess(res, result, "Token berhasil diperbarui");
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
      } else {
        logger.error("[Auth] Refresh error:", error);
        sendError(res, 401, "Gagal memperbarui token.");
      }
    }
  }

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user!.id, currentPassword, newPassword);
      sendSuccess(res, null, "Password berhasil diubah. Semua perangkat akan logout.");
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
      } else {
        logger.error("[Auth] Change password error:", error);
        sendError(res, 500, "Terjadi kesalahan server.");
      }
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      await authService.logout(req.user!.id);
      sendSuccess(res, null, "Logout berhasil");
    } catch (error: any) {
      logger.error("[Auth] Logout error:", error);
      sendError(res, 500, "Terjadi kesalahan server.");
    }
  }
}

export const authController = new AuthController();
```

#### Task 2.3: Refactor Auth Route (menjadi sangat tipis)

**File:** `api/src/routes/auth.route.ts` (REFACTORED)
```typescript
import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { verifyJWT } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { authLimiter } from "../middleware/rate-limit";
import { z } from "zod";

const router = Router();

// Validation schemas
const loginSchema = z.object({
  identifier: z.string().min(1, "Email / NIS / NIP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token wajib diisi"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1),
  defaultPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

// Routes — hanya routing, tidak ada business logic!
router.post("/login", authLimiter, validate(loginSchema), (req, res) => authController.login(req, res));
router.get("/me", verifyJWT, (req, res) => authController.me(req, res));
router.post("/refresh", validate(refreshSchema), (req, res) => authController.refresh(req, res));
router.put("/change-password", verifyJWT, validate(changePasswordSchema), (req, res) => authController.changePassword(req, res));
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), (req, res) => authController.forgotPassword(req, res));
router.post("/logout", verifyJWT, (req, res) => authController.logout(req, res));

export default router;
```

#### Task 2.4: Buat Student Service

**File:** `api/src/services/student.service.ts`
```typescript
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { generateUniqueUserCode } from "../lib/userCode";
import { logger } from "../utils/logger";

export interface CreateStudentInput {
  nis: string;
  name: string;
  gender: "L" | "P";
  birthDate: string;
  address?: string;
  phone?: string;
  classId: number;
  status?: string;
}

export interface StudentFilter {
  search?: string;
  className?: string;
  page: number;
  limit: number;
  role: string;
  userId: number;
}

export class StudentService {
  async create(data: CreateStudentInput) {
    const { nis, name } = data;

    // Generate unique code
    let userCode = "";
    let isUnique = false;
    while (!isUnique) {
      const rawCode = await generateUniqueUserCode("student");
      userCode = `S${rawCode}`;
      const exists = await prisma.user.findFirst({ where: { userCode } });
      if (!exists) isUnique = true;
    }

    const defaultPassword = userCode;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // Transaction: create student + user
    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          nis,
          name,
          gender: data.gender,
          birthDate: new Date(data.birthDate),
          address: data.address,
          phone: data.phone,
          classId: data.classId,
          status: "active",
        },
      });

      await tx.user.create({
        data: {
          name,
          nipNis: nis,
          userCode,
          password: hashedPassword,
          role: "student",
          studentId: student.id,
        },
      });

      return student;
    });

    logger.info(`Student created: ${nis} - ${name}`);

    return {
      student: result,
      defaultPassword,
      hint: result.phone ? `HP: ${result.phone}` : `NIS: ${result.nis}`,
    };
  }

  async findAll(filter: StudentFilter) {
    const where: any = { deletedAt: null };

    // Role-based filtering
    if (filter.role === "student") {
      const student = await prisma.student.findFirst({
        where: { user: { id: filter.userId }, deletedAt: null },
      });
      if (!student) return { data: [], total: 0 };
      where.id = student.id;
    } else if (filter.role === "guardian") {
      const guardian = await prisma.guardian.findFirst({
        where: { user: { id: filter.userId } },
        include: { students: { select: { id: true } } },
      });
      const childIds = guardian?.students.map(s => s.id) || [];
      if (childIds.length === 0) return { data: [], total: 0 };
      where.id = { in: childIds };
    }

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: "insensitive" } },
        { nis: { contains: filter.search } },
      ];
    }
    if (filter.className) {
      where.class = { name: filter.className };
    }

    const isStaff = filter.role === "admin" || filter.role === "kepala_sekolah" || filter.role === "teacher";

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: { select: { id: true, name: true } },
          guardians: isStaff ? { select: { id: true, name: true } } : false,
          user: isStaff ? { select: { userCode: true } } : false,
        },
        orderBy: { id: "asc" },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.student.count({ where }),
    ]);

    return { data: students, total };
  }

  async findById(id: number, role: string, userId: number) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true } },
        guardians: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!student) throw new AppError(404, "Siswa tidak ditemukan");

    // Ownership check
    if (role === "student") {
      const currentStudent = await prisma.student.findFirst({
        where: { user: { id: userId } },
        select: { id: true },
      });
      if (currentStudent?.id !== id) {
        throw new AppError(403, "Akses ditolak.");
      }
    } else if (role === "guardian") {
      const guardian = await prisma.guardian.findFirst({
        where: { user: { id: userId } },
        include: { students: { select: { id: true } } },
      });
      const childIds = guardian?.students.map(s => s.id) || [];
      if (!childIds.includes(id)) {
        throw new AppError(403, "Akses ditolak.");
      }
    }

    return student;
  }

  async softDelete(id: number) {
    await prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id } });
      if (!student || student.deletedAt) throw new AppError(404, "Siswa tidak ditemukan");

      await tx.student.update({
        where: { id },
        data: { deletedAt: new Date(), status: "inactive" },
      });

      // Revoke all refresh tokens for this student
      const user = await tx.user.findFirst({ where: { studentId: id } });
      if (user) {
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { force_change_password: true },
        });
      }
    });

    logger.info(`Student ${id} soft deleted`);
  }
}

export const studentService = new StudentService();
```

#### Task 2.5: Buat Principal Service (Fix N+1 Queries)

**File:** `api/src/services/principal.service.ts`
```typescript
import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";

export class PrincipalService {
  /**
   * Get dashboard summary — OPTIMIZED: Single query patterns.
   * Tidak ada N+1 queries!
   */
  async getSummary() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Parallel queries — all efficient
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      activeYear,
      recentAnnouncements,
      attendanceStats,
      teacherAttendanceStats,
    ] = await Promise.all([
      prisma.student.count({ where: { status: "active" } }),
      prisma.teacher.count({ where: { status: "active" } }),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.academicYear.findFirst({ where: { isActive: true } }),
      prisma.announcement.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      // Single query: attendance stats by class this month
      prisma.attendance.groupBy({
        by: ["studentId", "status"],
        where: { date: { gte: startOfMonth } },
        _count: { status: true },
      }),
      // Teacher attendance this month
      prisma.teacherAttendance.findMany({
        where: { date: { gte: startOfMonth } },
        select: { status: true, teacherId: true },
      }),
    ]);

    // Process attendance stats (no DB queries!)
    const studentPresent = attendanceStats
      .filter(a => a.status === "hadir")
      .reduce((sum, a) => sum + a._count.status, 0);
    const totalAttendance = attendanceStats.reduce((sum, a) => sum + a._count.status, 0);
    const attendanceRate = totalAttendance > 0 ? Math.round((studentPresent / totalAttendance) * 100) : 0;

    // Top students using raw query for performance
    const topStudents = await prisma.$queryRaw<Array<{
      student_id: number;
      name: string;
      class_name: string;
      avg_score: number;
    }>>`
      SELECT 
        s.id as student_id,
        s.name,
        c.name as class_name,
        AVG(g.score / g.max_score * 100) as avg_score
      FROM grades g
      JOIN students s ON s.id = g.student_id
      JOIN classes c ON c.id = s.class_id
      WHERE s.status = 'active'
      GROUP BY s.id, s.name, c.name
      ORDER BY avg_score DESC
      LIMIT 4
    `;

    // Attendance by class (single query with GROUP BY)
    const attendanceByClass = await prisma.$queryRaw<Array<{
      class_name: string;
      present: bigint;
      total: bigint;
    }>>`
      SELECT 
        c.name as class_name,
        COUNT(*) FILTER (WHERE a.status = 'hadir') as present,
        COUNT(*) as total
      FROM attendances a
      JOIN students s ON s.id = a.student_id
      JOIN classes c ON c.id = s.class_id
      WHERE a.date >= ${startOfMonth}
      GROUP BY c.name
    `;

    // At-risk students — single query!
    const atRiskStudents = await prisma.$queryRaw<Array<{
      student_id: number;
      name: string;
      class_name: string;
      attendance_rate: number;
      guardian_name: string | null;
      guardian_phone: string | null;
    }>>`
      SELECT 
        s.id as student_id,
        s.name,
        c.name as class_name,
        ROUND(
          COUNT(*) FILTER (WHERE a.status = 'hadir')::numeric / COUNT(*) * 100
        ) as attendance_rate,
        g.name as guardian_name,
        g.phone as guardian_phone
      FROM attendances a
      JOIN students s ON s.id = a.student_id
      JOIN classes c ON c.id = s.class_id
      LEFT JOIN guardians_students gs ON gs.student_id = s.id
      LEFT JOIN guardians g ON g.id = gs.guardian_id
      WHERE a.date >= ${startOfMonth}
      GROUP BY s.id, s.name, c.name, g.name, g.phone
      HAVING ROUND(
        COUNT(*) FILTER (WHERE a.status = 'hadir')::numeric / COUNT(*) * 100
      ) < 75
      ORDER BY attendance_rate ASC
    `;

    // Teacher attendance rate
    const teacherHadirCount = teacherAttendanceStats.filter(
      a => a.status === 'hadir' || a.status === 'terlambat'
    ).length;
    const teacherAttendanceRate = teacherAttendanceStats.length > 0
      ? Math.round((teacherHadirCount / teacherAttendanceStats.length) * 100)
      : 0;

    return {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      attendanceRate,
      academicYear: activeYear ? `${activeYear.name} - ${activeYear.semester}` : "-",
      recentAnnouncements,
      topStudents: topStudents.map(s => ({
        name: s.name,
        className: s.class_name,
        avgScore: Math.round(Number(s.avg_score) * 10) / 10,
      })),
      attendanceByClass: attendanceByClass.map(c => ({
        className: c.class_name,
        rate: Number(c.total) > 0 ? Math.round(Number(c.present) / Number(c.total) * 100) : 0,
        presentDays: Number(c.present),
        totalDays: Number(c.total),
      })),
      lowAttendanceAlert: attendanceByClass
        .filter(c => Number(c.total) > 0 && Math.round(Number(c.present) / Number(c.total) * 100) < 80)
        .map(c => ({
          className: c.class_name,
          rate: Math.round(Number(c.present) / Number(c.total) * 100),
        })),
      teacherAttendanceRate,
      atRiskStudents: atRiskStudents.map(s => ({
        studentId: s.student_id,
        name: s.name,
        className: s.class_name,
        attendanceRate: Number(s.attendance_rate),
        guardian: s.guardian_name ? { name: s.guardian_name, phone: s.guardian_phone } : null,
      })),
      atRiskCount: atRiskStudents.length,
    };
  }

  /**
   * Attendance trend — OPTIMIZED: Single query per month, not per level!
   */
  async getAttendanceTrend(monthsCount = 6) {
    const now = new Date();
    const studentTrend: any[] = [];
    const teacherTrend: any[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      const monthLabel = startOfMonth.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

      // Single query for ALL levels
      const byLevel = await prisma.$queryRaw<Array<{
        level: number;
        total: bigint;
        present: bigint;
      }>>`
        SELECT 
          c.level,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE a.status = 'hadir') as present
        FROM attendances a
        JOIN students s ON s.id = a.student_id
        JOIN classes c ON c.id = s.class_id
        WHERE a.date >= ${startOfMonth} AND a.date <= ${endOfMonth}
        GROUP BY c.level
      `;

      const monthData: any = { month: monthLabel };
      for (const row of byLevel) {
        monthData[String(row.level)] = Number(row.total) > 0
          ? Math.round(Number(row.present) / Number(row.total) * 100)
          : null;
      }
      // Fill missing levels with null
      for (const level of [7, 8, 9, 10, 11, 12]) {
        if (monthData[String(level)] === undefined) {
          monthData[String(level)] = null;
        }
      }
      studentTrend.push(monthData);

      // Teacher attendance
      const teacherStats = await prisma.$queryRaw<Array<{ total: bigint; present: bigint }>>`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status IN ('hadir', 'terlambat')) as present
        FROM teacher_attendances
        WHERE date >= ${startOfMonth} AND date <= ${endOfMonth}
      `;

      const teacherRate = teacherStats[0] && Number(teacherStats[0].total) > 0
        ? Math.round(Number(teacherStats[0].present) / Number(teacherStats[0].total) * 100)
        : null;

      teacherTrend.push({ month: monthLabel, rate: teacherRate });
    }

    return { studentTrend, teacherTrend };
  }
}

export const principalService = new PrincipalService();
```

---

## 5. PHASE 3: SECURITY & PERFORMANCE (Minggu 5-6)

### Task 3.1: Fix JWT Storage (Frontend - HttpOnly Cookie + BFF)

**File:** `web/src/lib/axios.ts` (REFACTORED)
```typescript
import axios from "axios";
import { getApiBaseUrl } from "@/lib/api-url";

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  withCredentials: true, // Penting! Kirim cookies
});

// Tidak ada lagi localStorage.setItem("jwt_token")!
// Token dikelola oleh httpOnly cookies dari server

// Request interceptor — hanya set Content-Type
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    if (!config.headers["Content-Type"] && !(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 dengan refresh via cookie
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        // Refresh token ada di httpOnly cookie, dikirim otomatis
        const response = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {}, {
          withCredentials: true,
        });
        if (response.data?.success) {
          return api(error.config); // Retry original request
        }
      } catch {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Task 3.2: Migrasi dari localStorage ke httpOnly Cookie

**File:** `web/src/lib/auth-utils.ts` (REFACTORED)
```typescript
/**
 * NEW: Access token disimpan di React state (memory only!)
 * Refresh token di httpOnly cookie (server-set)
 * Tidak ada lagi localStorage.setItem untuk token!
 */

// In-memory token store (hilang saat page refresh, harus refresh token)
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

export async function performLogout(): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include", // Kirim httpOnly cookie
    });
  } catch {
    // Ignore
  } finally {
    clearAccessToken();
    window.location.href = "/login";
  }
}
```

### Task 3.3: Add Unique Constraint untuk Attendance

**File:** `api/prisma/schema.prisma` (UPDATE)
```prisma
model Attendance {
  id        Int              @id @default(autoincrement())
  date      DateTime
  status    AttendanceStatus
  note      String?
  studentId Int              @map("student_id")
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")
  student   Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([studentId, date])  // NEW: Prevent duplicate attendance!
  @@index([date])
  @@index([status])
  @@index([studentId])         // NEW: Index for foreign key
  @@map("attendances")
}

model Grade {
  id         Int       @id @default(autoincrement())
  // ... existing fields ...

  @@index([date])
  @@index([type])
  @@index([studentId])   // NEW
  @@index([subjectId])   // NEW
  @@map("grades")
}
```

### Task 3.4: Fix Default Attendance Bug

**File:** `api/src/services/attendance.service.ts`
```typescript
async getByClassAndDate(classId: number, date: Date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(targetDate.getDate() + 1);

  const students = await prisma.student.findMany({
    where: { classId },
    include: {
      attendances: {
        where: {
          date: { gte: targetDate, lt: nextDay },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return students.map(s => {
    const attendance = s.attendances[0];
    return {
      studentId: s.id,
      nis: s.nis,
      name: s.name,
      // FIXED: Tidak default ke "hadir"!
      status: attendance ? attendance.status : null,  // null = belum diisi
      note: attendance ? attendance.note : "",
      isFilled: !!attendance,  // NEW: flag apakah sudah diisi
    };
  });
}
```

### Task 3.5: Fix Race Condition di Bulk Attendance

**File:** `api/src/services/attendance.service.ts`
```typescript
async bulkCreateAttendance(classId: number, date: Date, records: Array<{ studentId: number; status: string; note?: string }>) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // GUNAKAN TRANSACTION dengan select FOR UPDATE untuk mencegah race condition!
  await prisma.$transaction(async (tx) => {
    // Lock the rows
    const existing = await tx.$queryRaw`
      SELECT student_id FROM attendances 
      WHERE date = ${targetDate}::date 
        AND student_id IN (SELECT id FROM students WHERE class_id = ${classId})
      FOR UPDATE
    `;

    if (Array.isArray(existing) && existing.length > 0) {
      throw new AppError(400, "Data absensi untuk kelas dan tanggal ini sudah ada.");
    }

    await tx.attendance.createMany({
      data: records.map(r => ({
        studentId: r.studentId,
        date: targetDate,
        status: r.status as any,
        note: r.note,
      })),
    });
  });
}
```

---

## 6. PHASE 4: SCALABILITY (Minggu 7-8)

### Task 4.1: Redis Caching Layer

**File:** `api/src/config/redis.ts`
```typescript
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null; // Stop retrying
    return Math.min(times * 200, 2000);
  },
});

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[Redis] Connected successfully");
});

// Cache helper
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  const data = await fetchFn();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}
```

**File:** `api/src/services/principal.service.ts` (with cache)
```typescript
import { getOrSetCache } from "../config/redis";

class PrincipalService {
  async getSummary() {
    const cacheKey = `principal:summary:${new Date().toISOString().slice(0, 10)}`;
    
    return getOrSetCache(cacheKey, async () => {
      // ... existing implementation ...
    }, 300); // Cache 5 menit
  }
}
```

### Task 4.2: Queue System untuk Export

**File:** `api/src/config/queue.ts`
```typescript
import Bull from "bull";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const exportQueue = new Bull("export", redisUrl, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

// Process export jobs
exportQueue.process(async (job) => {
  const { type, params } = job.data;
  
  switch (type) {
    case "attendance":
      return await processAttendanceExport(params);
    case "grades":
      return await processGradeExport(params);
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
});

async function processAttendanceExport(params: any) {
  // Heavy export logic di background
  const workbook = new ExcelJS.Workbook();
  // ... build workbook ...
  
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Save to temp storage or return directly
  return { buffer, fileName: `export_${Date.now()}.xlsx` };
}
```

---

## 7. PHASE 5: FRONTEND REFACTOR (Minggu 9-10)

### Task 5.1: Implementasi TanStack Query

**File:** `web/src/services/queryClient.ts`
```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 detik sebelum dianggap stale
      gcTime: 5 * 60_000, // 5 menit garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**File:** `web/src/hooks/useStudents.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export function useStudents(params?: { search?: string; className?: string; page?: number }) {
  return useQuery({
    queryKey: ["students", params],
    queryFn: async () => {
      const response = await api.get("/students", { params });
      return response.data;
    },
  });
}

export function useStudent(id: number) {
  return useQuery({
    queryKey: ["students", id],
    queryFn: async () => {
      const response = await api.get(`/students/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/students", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
```

### Task 5.2: Auth Provider (Memory-only Token)

**File:** `web/src/components/providers/AuthProvider.tsx`
```typescript
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { setAccessToken, clearAccessToken, getAccessToken } from "@/lib/auth-utils";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  force_change_password: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status on mount — token dari httpOnly cookie dikirim otomatis
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await api.get("/auth/me");
        if (response.data?.success) {
          setUser(response.data.data.user);
        }
      } catch {
        // Not authenticated
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const response = await api.post("/auth/login", { identifier, password });
    const { token, user: userData } = response.data.data;
    
    // Token disimpan di MEMORY, bukan localStorage!
    setAccessToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    clearAccessToken();
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

---

## 8. PHASE 6: PRODUCTION HARDENING (Minggu 11-12)

### Task 6.1: Docker Improvement

**File:** `maleo-new/docker-compose.yml` (REFACTORED)
```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: maleo-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: maleo
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # Gunakan .env file!
      TZ: Asia/Jakarta
    command: ["postgres", "-c", "timezone=Asia/Jakarta"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups  # Mount backup directory
    ports:
      - "127.0.0.1:5432:5432"  # Hanya localhost access!
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d maleo"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: maleo-redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: maleo-api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    env_file:
      - ./api/.env.production  # Gunakan file env terpisah!
    environment:
      TZ: Asia/Jakarta
      NODE_ENV: production
      REDIS_URL: redis://redis:6379
    ports:
      - "127.0.0.1:4000:4000"  # Hanya localhost, reverse proxy handle public
    volumes:
      - api_uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://api.maleo.sch.id  # Domain production!
    container_name: maleo-web
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    environment:
      TZ: Asia/Jakarta
      NODE_ENV: production
    ports:
      - "127.0.0.1:3000:3000"

  # NEW: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: maleo-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - api_uploads:/app/uploads:ro
    depends_on:
      - api
      - web

volumes:
  postgres_data:
  redis_data:
  api_uploads:
```

### Task 6.2: Backup Script

**File:** `maleo-new/scripts/backup.sh`
```bash
#!/bin/bash
# Database backup script — jalankan via cron setiap hari jam 2AM

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="maleo"
DB_USER="postgres"

# Create backup
pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${DB_NAME}_${TIMESTAMP}.sql.gz"
```

### Task 6.3: Nginx Configuration

**File:** `maleo-new/nginx/nginx.conf`
```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:4000;
    }

    upstream web {
        server web:3000;
    }

    server {
        listen 80;
        server_name maleo.sch.id;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name maleo.sch.id;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";

        # API proxy
        location /api/ {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Uploads proxy
        location /uploads/ {
            proxy_pass http://api;
            proxy_set_header Host $host;
        }

        # Frontend
        location / {
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

## 9. KODE CONTOH LENGKAP: FLOW LENGKAP

### Contoh: Flow Lengkap CRUD Student dengan Arsitektur Baru

**Step 1: Route** (`api/src/routes/students.route.ts`)
```typescript
import { Router } from "express";
import { studentController } from "../controllers/student.controller";
import { verifyJWT } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { validate } from "../middleware/validate";
import { studentSchema } from "../validations/student.validation";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", verifyJWT, (req, res) => studentController.findAll(req, res));
router.get("/:id", verifyJWT, (req, res) => studentController.findById(req, res));
router.post("/", verifyJWT, checkRole("admin"), validate(studentSchema), (req, res) => studentController.create(req, res));
router.put("/:id", verifyJWT, checkRole("admin"), validate(studentSchema.partial()), (req, res) => studentController.update(req, res));
router.delete("/:id", verifyJWT, checkRole("admin"), (req, res) => studentController.delete(req, res));
router.post("/import", verifyJWT, checkRole("admin"), upload.single("file"), (req, res) => studentController.importExcel(req, res));
router.get("/export", verifyJWT, checkRole("admin"), (req, res) => studentController.exportExcel(req, res));

export default router;
```

**Step 2: Controller** (`api/src/controllers/student.controller.ts`)
```typescript
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { studentService } from "../services/student.service";
import { sendSuccess, sendError, sendPaginated } from "../lib/response";
import { logger } from "../utils/logger";

export class StudentController {
  async findAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { search, className, page = "1", limit = "20" } = req.query;
      const result = await studentService.findAll({
        search: search as string,
        className: className as string,
        page: Number(page),
        limit: Number(limit),
        role: req.user!.role,
        userId: req.user!.id,
      });
      sendPaginated(res, result.data, {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
      });
    } catch (error: any) {
      logger.error("[Student] findAll error:", error);
      sendError(res, 500, "Terjadi kesalahan server.");
    }
  }

  async findById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const student = await studentService.findById(
        Number(req.params.id),
        req.user!.role,
        req.user!.id
      );
      sendSuccess(res, student);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
      } else {
        logger.error("[Student] findById error:", error);
        sendError(res, 500, "Terjadi kesalahan server.");
      }
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await studentService.create(req.body);
      sendSuccess(res, {
        ...result.student,
        disambiguationHint: result.hint,
      }, `Siswa berhasil ditambahkan. Password: ${result.defaultPassword}`, 201);
    } catch (error: any) {
      if (error.statusCode || error.code === "P2002") {
        sendError(res, error.statusCode || 400, 
          error.code === "P2002" ? "NIS sudah digunakan" : error.message);
      } else {
        logger.error("[Student] create error:", error);
        sendError(res, 500, "Terjadi kesalahan server.");
      }
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await studentService.softDelete(Number(req.params.id));
      sendSuccess(res, null, "Siswa berhasil dihapus.");
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.statusCode, error.message);
      } else {
        logger.error("[Student] delete error:", error);
        sendError(res, 500, "Terjadi kesalahan server.");
      }
    }
  }
}

export const studentController = new StudentController();
```

**Step 3: Service** (sudah di atas di Student Service)

---

## 10. DATABASE MIGRATION PLAN

### Migration 1: Add Missing Indexes
```sql
-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON attendances(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendances_student_date ON attendances(student_id, date);

-- Grade indexes
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON grades(subject_id);

-- Refresh token cleanup index
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

### Migration 2: Add PgBouncer Support
```sql
-- For connection pooling with Prisma
-- PgBouncer requires prepared statements disabled
-- Set in datasource: connection_limit = 20
```

---

## 11. TIMELINE & MILESTONE

```
Minggu 1-2: PHASE 1 - FOUNDATION
├── [ ] Buat response helper (lib/response.ts)
├── [ ] Buat error handler terpusat
├── [ ] Buat logger utility
├── [ ] Buat ownership middleware
├── [ ] Update index.ts
├── [ ] Buat type definitions
└── [ ] ✅ MILESTONE: Infrastructure siap

Minggu 3-4: PHASE 2 - SERVICE LAYER
├── [ ] Auth service + controller
├── [ ] Student service + controller
├── [ ] Teacher service + controller
├── [ ] Attendance service + controller
├── [ ] Principal service (optimized)
├── [ ] LMS service + controller
├── [ ] Grade service + controller
└── [ ] ✅ MILESTONE: Semua route refactored

Minggu 5-6: PHASE 3 - SECURITY & PERFORMANCE
├── [ ] Fix JWT storage (httpOnly cookie)
├── [ ] AuthProvider (memory token)
├── [ ] Add missing DB indexes
├── [ ] Fix default attendance bug
├── [ ] Fix race condition bulk attendance
├── [ ] Fix N+1 queries (principal)
├── [ ] Fix JWT_REFRESH_SECRET validation
└── [ ] ✅ MILESTONE: Security & performance OK

Minggu 7-8: PHASE 4 - SCALABILITY
├── [ ] Install & configure Redis
├── [ ] Implement caching layer
├── [ ] Install & configure Bull queue
├── [ ] Queue untuk export Excel
├── [ ] Add PgBouncer
└── [ ] ✅ MILESTONE: Scaling infrastructure siap

Minggu 9-10: PHASE 5 - FRONTEND REFACTOR
├── [ ] Install TanStack Query
├── [ ] Buat custom hooks (useStudents, useTeachers, dll)
├── [ ] Buat AuthProvider
├── [ ] Buat ErrorBoundary components
├── [ ] Fix API URL configuration
└── [ ] ✅ MILESTONE: Frontend modern & aman

Minggu 11-12: PHASE 6 - PRODUCTION HARDENING
├── [ ] Nginx reverse proxy
├── [ ] SSL/TLS configuration
├── [ ] Backup strategy & script
├── [ ] Monitoring setup
├── [ ] Docker compose production
├── [ ] Healthcheck endpoints
├── [ ] Graceful shutdown
├── [ ] Clean seed data
└── [ ] ✅ MILESTONE: PRODUCTION READY!
```

---

## 12. SUCCESS METRICS

| Metrik | Saat Ini | Target Setelah Refactor |
|--------|----------|------------------------|
| Architecture Score | 3/10 | 8/10 |
| Security Score | 5/10 | 8/10 |
| Performance Score | 3/10 | 7/10 |
| Scalability Score | 2/10 | 7/10 |
| Production Readiness | 3/10 | 8/10 |
| Response Time (Dashboard) | 5-10 detik (N+1) | < 1 detik |
| Concurrent Users | ~50 (stress) | 500+ (stable) |
| Code Duplication | High | Minimal |
| Testability | Tidak testable | Unit test ready |
| Database Connections | Prisma default | PgBouncer managed |

---

## APPENDIX: Library yang Perlu Diinstall

### Backend (api/)
```bash
# Logging
npm install winston

# Queue (Phase 4)
npm install bull ioredis

# Caching (Phase 4)
npm install ioredis

# Validation (already have)
# zod

# Testing
npm install -D vitest @types/jest
```

### Frontend (web/)
```bash
# React Query (Phase 5)
npm install @tanstack/react-query @tanstack/react-query-devtools

# Already have
# axios, zod
```

---

*Dokumen ini adalah panduan implementasi berdasarkan hasil audit arsitektur.*  
*Setiap phase harus di-test sebelum lanjut ke phase berikutnya.*  
*Prioritas: Phase 1 → Phase 2 → Phase 3 adalah mandatory sebelum production go-live.*