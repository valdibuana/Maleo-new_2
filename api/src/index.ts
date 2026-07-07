import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { apiLimiter } from "./middleware/rate-limit";
import { requestLogger } from "./middleware/logger";
import { sanitizeBody } from "./middleware/sanitize";

// ──────────────────────────────────────────────
// Startup Environment Validation
// ──────────────────────────────────────────────
const REQUIRED_ENV_VARS = ["JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"] as const;

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    console.error(`[FATAL] Missing required environment variable: ${envVar}`);
    console.error(`        Copy api/.env.example to api/.env and fill in the values.`);
    process.exit(1);
  }
}

if (
  process.env.JWT_SECRET === "fallback_secret" ||
  process.env.JWT_SECRET === "CHANGE_ME_generate_a_strong_random_secret" ||
  process.env.JWT_SECRET === "replace_with_strong_secret_for_production" ||
  process.env.JWT_SECRET === "maleo_dev_jwt_secret_2026_change_me"
) {
  console.error(`[FATAL] JWT_SECRET is using a default/placeholder value.`);
  console.error(`        Generate a strong secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
  process.exit(1);
}

import { AppError } from "./lib/errors";

import authRouter from "./routes/auth.route";
import studentsRouter from "./routes/students.route";
import teachersRouter from "./routes/teachers.route";
import guardiansRouter from "./routes/guardians.route";
import academicYearsRouter from "./routes/academic-years.route";
import classesRouter from "./routes/classes.route";
import subjectsRouter from "./routes/subjects.route";
import schedulesRouter from "./routes/schedules.route";
import attendancesRouter from "./routes/attendances.route";
import gradesRouter from "./routes/grades.route";
import announcementsRouter from "./routes/announcements.route";
import usersRouter from "./routes/user.route";
import dashboardRouter from "./routes/dashboard.route";
import hubTeacherRouter from "./routes/hub-teacher.route";
import hubRouter from "./routes/hub.route";
import gradeConfigRouter from "./routes/grade-config.route";
import learningModulesRouter from "./routes/learning-modules.route";
import principalsRouter from "./routes/principals.route";
import principalRouter from "./routes/principal.route";
import teacherAttendancesRouter from "./routes/teacher-attendances.route";
import notificationRouter from "./routes/notification.route";
import lmsRouter from "./routes/lms.route";
import profileRouter from "./routes/profile.route";
import connectRouter from "./routes/connect.route";
import atpRouter from "./routes/atp.route";
import classificationRouter from "./routes/classification.route";
import recycleBinRouter from "./routes/recycle-bin.route";
import scheduleSlotsRouter from "./routes/schedule-slots.route";
import exportRouter from "./routes/export.route";
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(requestLogger); // Request logging for audit trail
app.use(helmet({ crossOriginEmbedderPolicy: false })); // Security headers

// CORS — support comma-separated list of allowed origins
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, Postman, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: origin "${origin}" not allowed`));
      }
    },
    credentials: true,
  })
);

app.use("/api", apiLimiter); // Global rate limit on all API routes


app.use(express.json());
app.use(compression()); // Gzip/Brotli response compression (~70% smaller payloads)
app.use(sanitizeBody); // Input sanitization (XSS prevention)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/teachers", teachersRouter);
app.use("/api/guardians", guardiansRouter);
app.use("/api/academic-years", academicYearsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/subjects", subjectsRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/attendances", attendancesRouter);
app.use("/api/grades", gradesRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/principals", principalsRouter);
app.use("/api/principal", principalRouter);
app.use("/api/teacher-attendances", teacherAttendancesRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/users", usersRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/hub/teacher/learning-modules", learningModulesRouter);
app.use("/api/hub/teacher", hubTeacherRouter);
app.use("/api/grade-config", gradeConfigRouter);
app.use("/api/hub", hubRouter);
app.use("/api/lms", lmsRouter);
app.use("/api/atp", atpRouter);
app.use("/api/profile", profileRouter);
app.use("/api/connect", connectRouter);
app.use("/api/classification", classificationRouter);
app.use("/api/schedule-slots", scheduleSlotsRouter);
app.use("/api/export", exportRouter);
app.use("/api/recycle-bin", recycleBinRouter);

// Error Handler — centralized error processing
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Custom AppError (BadRequest, NotFound, Forbidden, etc.)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Multer file type errors
  if (err instanceof Error && err.message.includes("File type not supported")) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Multer file size errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "Ukuran file terlalu besar. Maksimal 20MB." });
  }

  // CORS errors
  if (err instanceof Error && err.message.includes("CORS blocked")) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Prisma unique constraint violation
  if (err.code === "P2002") {
    return res.status(409).json({ success: false, message: "Data sudah ada di sistem." });
  }

  // Prisma record not found
  if (err.code === "P2025") {
    return res.status(404).json({ success: false, message: "Data tidak ditemukan." });
  }

  // Unknown errors — never leak internals in production
  console.error("[Unhandled Error]", err);
  res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server.",
    ...(process.env.NODE_ENV === "development" ? { error: err.message } : {}),
  });
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Maleo API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});
