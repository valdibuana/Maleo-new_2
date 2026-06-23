/**
 * Decode JWT payload without verification.
 * Used ONLY in Next.js middleware for route protection (redirects).
 * The real JWT verification always happens on the backend API.
 *
 * This prevents role manipulation via cookie tampering because
 * the role is extracted from the signed JWT token itself.
 */
export function decodeJwtPayload(
  token: string
): { id: number; role: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded);

    if (!parsed.id || !parsed.role) return null;

    return {
      id: parsed.id,
      role: parsed.role,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired based on the `exp` claim.
 */
export function isTokenExpired(payload: { exp?: number }): boolean {
  if (!payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}
