/**
 * Request logging middleware using morgan.
 * Logs method, URL, status, and response time for all API requests.
 * Essential for security monitoring and debugging on VPS.
 */
export declare const requestLogger: (req: import("http").IncomingMessage, res: import("http").ServerResponse<import("http").IncomingMessage>, callback: (err?: Error) => void) => void;
//# sourceMappingURL=logger.d.ts.map