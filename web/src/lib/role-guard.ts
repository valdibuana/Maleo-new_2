/**
 * Helper untuk mengecek apakah user memiliki akses Read-Only.
 * Digunakan di seluruh frontend untuk conditional rendering tombol CRUD.
 */
export const isReadOnlyRole = (role: string | null | undefined): boolean => {
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  return normalizedRole === "KEPALA_SEKOLAH" || normalizedRole === "PRINCIPAL";
};
