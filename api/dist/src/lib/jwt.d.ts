export interface JwtPayload {
    id: number;
    role: string;
    tokenType?: "access" | "refresh";
    jti?: string;
}
/**
 * Generate a unique token ID (jti) for refresh token rotation tracking.
 */
export declare function generateTokenId(): string;
/**
 * Hash a refresh token JWT string using SHA-256.
 * The hash is stored in the database instead of the raw JWT.
 */
export declare function hashToken(token: string): string;
export declare function signAccessToken(payload: JwtPayload): string;
/**
 * Sign a refresh token with a unique jti for rotation tracking.
 * @param payload - The JWT payload (id, role)
 * @param tokenId - The unique token ID (jti) generated via generateTokenId()
 */
export declare function signRefreshToken(payload: JwtPayload, tokenId: string): string;
export declare function verifyAccessToken(token: string): JwtPayload;
export declare function verifyRefreshToken(token: string): JwtPayload;
export declare const signToken: typeof signAccessToken;
export declare const verifyToken: typeof verifyAccessToken;
/**
 * Decode JWT payload without verification (for routing only).
 * Real verification must always happen on the backend.
 */
export declare function decodeTokenPayload(token: string): JwtPayload | null;
//# sourceMappingURL=jwt.d.ts.map