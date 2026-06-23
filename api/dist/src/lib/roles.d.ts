/**
 * Role constants – single source of truth for role strings.
 * Mirrors Prisma's Role enum to avoid magic strings in route handlers.
 *
 * Usage:
 *   import { ROLES } from "../lib/roles";
 *   if (role === ROLES.STUDENT) { ... }
 */
export declare const ROLES: {
    readonly ADMIN: "admin";
    readonly KEPALA_SEKOLAH: "kepala_sekolah";
    readonly TEACHER: "teacher";
    readonly STUDENT: "student";
    readonly GUARDIAN: "guardian";
};
export type RoleKey = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[RoleKey];
/** Check if a role is a staff role (admin or kepala_sekolah) */
export declare const isStaffRole: (role: string) => boolean;
/** Check if a role can manage grades */
export declare const canManageGrades: (role: string) => boolean;
//# sourceMappingURL=roles.d.ts.map