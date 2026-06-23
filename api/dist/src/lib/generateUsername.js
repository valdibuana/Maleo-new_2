"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueUsername = generateUniqueUsername;
const prisma_1 = require("./prisma");
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
async function generateUniqueUsername(fullName) {
    // Ambil HANYA nama depan (kata pertama)
    const words = fullName.trim().split(/\s+/);
    const firstName = words[0];
    const restOfName = words.slice(1).join(" ");
    // Normalize: lowercase, remove accents, remove non-alpha
    const normalize = (str) => str
        .toLowerCase()
        .normalize("NFD") // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[^a-z]/g, ""); // Remove non-letters
    const base = normalize(firstName);
    if (!base) {
        throw new Error("Nama depan tidak valid untuk generate username");
    }
    // Try 1: Base name only (first name)
    let candidate = base;
    let existing = await prisma_1.prisma.user.findUnique({
        where: { username: candidate }
    });
    if (!existing) {
        console.log(`[GenerateUsername] Generated: "${candidate}" from "${fullName}"`);
        return candidate;
    }
    // Collision detected - Try adding 2-4 letters from last name
    if (restOfName) {
        const lastNameNormalized = normalize(restOfName);
        for (let len = 2; len <= Math.min(4, lastNameNormalized.length); len++) {
            candidate = base + lastNameNormalized.slice(0, len);
            existing = await prisma_1.prisma.user.findUnique({
                where: { username: candidate }
            });
            if (!existing) {
                console.log(`[GenerateUsername] Generated: "${candidate}" from "${fullName}" (added ${len} chars from last name)`);
                return candidate;
            }
        }
    }
    // Still collision - Fallback to numbers (last resort)
    let counter = 2;
    while (counter < 100) { // Safety limit
        candidate = `${base}${counter}`;
        existing = await prisma_1.prisma.user.findUnique({
            where: { username: candidate }
        });
        if (!existing) {
            console.log(`[GenerateUsername] Generated: "${candidate}" from "${fullName}" (added number ${counter})`);
            return candidate;
        }
        counter++;
    }
    // If we reach here, something is very wrong
    throw new Error(`Unable to generate unique username for "${fullName}" after 100 attempts`);
}
/**
 * Normalize a name for comparison (used in collision detection)
 */
function normalize(str) {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, "");
}
//# sourceMappingURL=generateUsername.js.map