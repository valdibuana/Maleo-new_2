"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeBody = void 0;
const xss_1 = __importDefault(require("xss"));
/**
 * Fields that should NOT be escaped because they intentionally contain
 * rich text or markup (e.g. learning module descriptions, consultation messages).
 */
const SKIP_ESCAPE_FIELDS = new Set([
    "content",
    "description",
    "message",
    "learningPath",
    "learningGoal",
    "activity",
    "assessment",
    "teacherNote",
    "feedback",
    "learningObjective",
    "learningStrategy",
]);
/**
 * Filter HTML to prevent stored XSS using xss library.
 * This replaces the manual regex escape implementation.
 */
const filterXss = (str) => {
    return (0, xss_1.default)(str);
};
/**
 * Recursively sanitize string values in an object.
 * - Trims whitespace from all strings
 * - Sanitizes HTML in strings (except for SKIP_ESCAPE_FIELDS)
 */
const sanitizeValue = (obj, parentKey) => {
    if (typeof obj === "string") {
        const trimmed = obj.trim();
        if (parentKey && SKIP_ESCAPE_FIELDS.has(parentKey)) {
            return trimmed;
        }
        return filterXss(trimmed);
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeValue(item, parentKey));
    }
    if (obj !== null && typeof obj === "object") {
        const sanitized = {};
        for (const key of Object.keys(obj)) {
            sanitized[key] = sanitizeValue(obj[key], key);
        }
        return sanitized;
    }
    return obj;
};
/**
 * Middleware that trims and sanitizes string inputs in req.body.
 * Applied globally after express.json().
 */
const sanitizeBody = (req, _res, next) => {
    if (req.body && typeof req.body === "object") {
        req.body = sanitizeValue(req.body);
    }
    next();
};
exports.sanitizeBody = sanitizeBody;
//# sourceMappingURL=sanitize.js.map