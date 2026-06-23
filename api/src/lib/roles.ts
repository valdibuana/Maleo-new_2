/**
 * Role constants – single source of truth for role strings.
 * Mirrors Prisma's Role enum to avoid magic strings in route handlers.
 *
 * Usage:
 *   import { ROLES } from "../lib/roles";
 *   if (role === ROLES.STUDENT) { ... }
 */
export const ROLES = {
  ADMIN: "admin",
  KEPALA_SEKOLAH: "kepala_sekolah",
  TEACHER: "teacher",
  STUDENT: "student",
  GUARDIAN: "guardian",
} as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[RoleKey];

/** Check if a role is a staff role (admin or kepala_sekolah) */
export const isStaffRole = (role: string): boolean =>
  role === ROLES.ADMIN || role === ROLES.KEPALA_SEKOLAH;

/** Check if a role can manage grades */
export const canManageGrades = (role: string): boolean =>
  role === ROLES.ADMIN || role === ROLES.TEACHER;
