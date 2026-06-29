"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const rate_limit_1 = require("./middleware/rate-limit");
const logger_1 = require("./middleware/logger");
const sanitize_1 = require("./middleware/sanitize");
// ──────────────────────────────────────────────
// Startup Environment Validation
// ──────────────────────────────────────────────
const REQUIRED_ENV_VARS = ["JWT_SECRET", "DATABASE_URL"];
for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
        console.error(`[FATAL] Missing required environment variable: ${envVar}`);
        console.error(`        Copy api/.env.example to api/.env and fill in the values.`);
        process.exit(1);
    }
}
if (process.env.JWT_SECRET === "fallback_secret" ||
    process.env.JWT_SECRET === "CHANGE_ME_generate_a_strong_random_secret") {
    console.error(`[FATAL] JWT_SECRET is using a default/placeholder value.`);
    console.error(`        Generate a strong secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
    process.exit(1);
}
const errors_1 = require("./lib/errors");
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const students_route_1 = __importDefault(require("./routes/students.route"));
const teachers_route_1 = __importDefault(require("./routes/teachers.route"));
const guardians_route_1 = __importDefault(require("./routes/guardians.route"));
const academic_years_route_1 = __importDefault(require("./routes/academic-years.route"));
const classes_route_1 = __importDefault(require("./routes/classes.route"));
const subjects_route_1 = __importDefault(require("./routes/subjects.route"));
const schedules_route_1 = __importDefault(require("./routes/schedules.route"));
const attendances_route_1 = __importDefault(require("./routes/attendances.route"));
const grades_route_1 = __importDefault(require("./routes/grades.route"));
const announcements_route_1 = __importDefault(require("./routes/announcements.route"));
const user_route_1 = __importDefault(require("./routes/user.route"));
const dashboard_route_1 = __importDefault(require("./routes/dashboard.route"));
const hub_teacher_route_1 = __importDefault(require("./routes/hub-teacher.route"));
const hub_route_1 = __importDefault(require("./routes/hub.route"));
const grade_config_route_1 = __importDefault(require("./routes/grade-config.route"));
const learning_modules_route_1 = __importDefault(require("./routes/learning-modules.route"));
const principals_route_1 = __importDefault(require("./routes/principals.route"));
const principal_route_1 = __importDefault(require("./routes/principal.route"));
const teacher_attendances_route_1 = __importDefault(require("./routes/teacher-attendances.route"));
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const lms_route_1 = __importDefault(require("./routes/lms.route"));
const profile_route_1 = __importDefault(require("./routes/profile.route"));
const connect_route_1 = __importDefault(require("./routes/connect.route"));
const atp_route_1 = __importDefault(require("./routes/atp.route"));
const classification_route_1 = __importDefault(require("./routes/classification.route"));
const schedule_slots_route_1 = __importDefault(require("./routes/schedule-slots.route"));
const export_route_1 = __importDefault(require("./routes/export.route"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Middleware
app.use(logger_1.requestLogger); // Request logging for audit trail
app.use((0, helmet_1.default)({ crossOriginEmbedderPolicy: false })); // Security headers
// CORS — support comma-separated list of allowed origins
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, Postman, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS blocked: origin "${origin}" not allowed`));
        }
    },
    credentials: true,
}));
app.use("/api", rate_limit_1.apiLimiter); // Global rate limit on all API routes
app.use(express_1.default.json());
app.use((0, compression_1.default)()); // Gzip/Brotli response compression (~70% smaller payloads)
app.use(sanitize_1.sanitizeBody); // Input sanitization (XSS prevention)
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Routes
app.use("/api/auth", auth_route_1.default);
app.use("/api/students", students_route_1.default);
app.use("/api/teachers", teachers_route_1.default);
app.use("/api/guardians", guardians_route_1.default);
app.use("/api/academic-years", academic_years_route_1.default);
app.use("/api/classes", classes_route_1.default);
app.use("/api/subjects", subjects_route_1.default);
app.use("/api/schedules", schedules_route_1.default);
app.use("/api/attendances", attendances_route_1.default);
app.use("/api/grades", grades_route_1.default);
app.use("/api/announcements", announcements_route_1.default);
app.use("/api/principals", principals_route_1.default);
app.use("/api/principal", principal_route_1.default);
app.use("/api/teacher-attendances", teacher_attendances_route_1.default);
app.use("/api/notifications", notification_route_1.default);
app.use("/api/users", user_route_1.default);
app.use("/api/dashboard", dashboard_route_1.default);
app.use("/api/hub/teacher/learning-modules", learning_modules_route_1.default);
app.use("/api/hub/teacher", hub_teacher_route_1.default);
app.use("/api/grade-config", grade_config_route_1.default);
app.use("/api/hub", hub_route_1.default);
app.use("/api/lms", lms_route_1.default);
app.use("/api/atp", atp_route_1.default);
app.use("/api/profile", profile_route_1.default);
app.use("/api/connect", connect_route_1.default);
app.use("/api/classification", classification_route_1.default);
app.use("/api/schedule-slots", schedule_slots_route_1.default);
app.use("/api/export", export_route_1.default);
// Error Handler — centralized error processing
app.use((err, req, res, _next) => {
    // Custom AppError (BadRequest, NotFound, Forbidden, etc.)
    if (err instanceof errors_1.AppError) {
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
//# sourceMappingURL=index.js.map