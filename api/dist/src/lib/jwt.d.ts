export interface JwtPayload {
    id: number;
    role: string;
    tokenType?: "access" | "refresh";
}
export declare function signAccessToken(payload: JwtPayload): string;
export declare function signRefreshToken(payload: JwtPayload): string;
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