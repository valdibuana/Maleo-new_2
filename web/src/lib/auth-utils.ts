import { jwtVerify, errors as joseErrors } from "jose";

/**
 * JWT payload structure matching the backend's signAccessToken output.
 */
export interface JwtPayload {
  id: number;
  role: string;
  tokenType?: "access" | "refresh";
  exp?: number;
}

/**
 * Encode the JWT_SECRET string into a Uint8Array suitable for jose's HS256.
 * Returns null if JWT_SECRET is not configured.
 */
function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/**
 * Verify a JWT token's signature AND decode its payload using the `jose` library.
 * This runs in Next.js Edge Middleware and uses Web Crypto (no Node.js crypto needed).
 *
 * If verification succeeds → returns the payload with { id, role, exp }.
 * If verification fails (tampered, expired, malformed) → returns null.
 *
 * Fallback: if JWT_SECRET is not set, falls back to decode-only (dev mode).
 */
export async function verifyJwt(
  token: string
): Promise<JwtPayload | null> {
  const secret = getSecret();

  // Fallback: if no JWT_SECRET configured, decode without verification (dev only)
  if (!secret) {
    console.warn(
      "[auth-utils] JWT_SECRET not set — falling back to unverified decode. " +
      "This is INSECURE and should only happen in development."
    );
    return decodeJwtPayload(token);
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    // Validate the payload contains required fields
    if (
      typeof payload.id !== "number" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    return {
      id: payload.id as number,
      role: payload.role as string,
      tokenType: payload.tokenType as JwtPayload["tokenType"],
      exp: payload.exp,
    };
  } catch (err) {
    // Token expired — still return null (treated as invalid session)
    if (err instanceof joseErrors.JWTExpired) {
      return null;
    }
    // Signature mismatch, malformed, etc.
    if (err instanceof joseErrors.JWSSignatureVerificationFailed) {
      console.warn("[auth-utils] JWT signature verification FAILED — possible tampering attempt.");
    }
    return null;
  }
}

/**
 * Decode JWT payload without verification.
 * Used ONLY as a fallback when JWT_SECRET is not available (dev mode).
 *
 * @deprecated Use verifyJwt() instead for production.
 */
export function decodeJwtPayload(
  token: string
): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Edge Runtime supports atob() — use it instead of Buffer
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(decoded);

    if (!parsed.id || !parsed.role) return null;

    return {
      id: parsed.id,
      role: parsed.role,
      tokenType: parsed.tokenType,
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
