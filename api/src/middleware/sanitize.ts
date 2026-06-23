import { Request, Response, NextFunction } from "express";

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
 * Escape HTML special characters to prevent stored XSS.
 */
const escapeHtml = (str: string): string =>
  str.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#x27;";
      default: return c;
    }
  });

/**
 * Recursively sanitize string values in an object.
 * - Trims whitespace from all strings
 * - Escapes HTML in strings (except for SKIP_ESCAPE_FIELDS)
 */
const sanitizeValue = (obj: any, parentKey?: string): any => {
  if (typeof obj === "string") {
    const trimmed = obj.trim();
    if (parentKey && SKIP_ESCAPE_FIELDS.has(parentKey)) {
      return trimmed;
    }
    return escapeHtml(trimmed);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeValue(item, parentKey));
  }
  if (obj !== null && typeof obj === "object") {
    const sanitized: any = {};
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
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
};
