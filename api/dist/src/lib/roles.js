"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canManageGrades = exports.isStaffRole = exports.ROLES = void 0;
/**
 * Role constants – single source of truth for role strings.
 * Mirrors Prisma's Role enum to avoid magic strings in route handlers.
 *
 * Usage:
 *   import { ROLES } from "../lib/roles";
 *   if (role === ROLES.STUDENT) { ... }
 */
exports.ROLES = {
    ADMIN: "admin",
    KEPALA_SEKOLAH: "kepala_sekolah",
    TEACHER: "teacher",
    STUDENT: "student",
    GUARDIAN: "guardian",
};
/** Check if a role is a staff role (admin or kepala_sekolah) */
const isStaffRole = (role) => role === exports.ROLES.ADMIN || role === exports.ROLES.KEPALA_SEKOLAH;
exports.isStaffRole = isStaffRole;
/** Check if a role can manage grades */
const canManageGrades = (role) => role === exports.ROLES.ADMIN || role === exports.ROLES.TEACHER;
exports.canManageGrades = canManageGrades;
//# sourceMappingURL=roles.js.map