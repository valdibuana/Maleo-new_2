/**
 * Role constants – shared between frontend and backend logic.
 * Mirrors Prisma's Role enum to avoid magic strings in route guards and UI.
 */
export const ROLES = {
  ADMIN: "admin",
  KEPALA_SEKOLAH: "kepala_sekolah",
  TEACHER: "teacher",
  STUDENT: "student",
  GUARDIAN: "guardian",
} as const;

export type RoleValue = (typeof ROLES)[keyof typeof ROLES];

/** All valid roles as an array for iteration */
export const ALL_ROLES: RoleValue[] = Object.values(ROLES);
