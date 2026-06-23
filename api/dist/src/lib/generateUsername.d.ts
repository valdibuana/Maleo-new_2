/**
 * Generate unique username dari nama lengkap
 * Logic:
 * 1. Ambil nama depan (first word)
 * 2. Normalize (lowercase, remove accents, remove non-alpha)
 * 3. Cek uniqueness - jika sudah ada:
 *    a. Coba tambah 2-4 huruf dari nama belakang
 *    b. Jika masih tabrakan, tambah angka (last resort)
 *
 * Examples:
 * - "Budi Santoso" → "budi" (available)
 * - "Budi Hartono" → "budih" or "budiha" (if "budi" taken)
 * - "Budi Wijaya" (third Budi) → "budiw" or "budiwi" (if "budi", "budih" taken)
 * - "Budi Ahmad" (fourth Budi) → "budi2" (if all name combinations taken)
 */
export declare function generateUniqueUsername(fullName: string): Promise<string>;
//# sourceMappingURL=generateUsername.d.ts.map