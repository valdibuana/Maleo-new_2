import morgan from "morgan";

/**
 * Request logging middleware using morgan.
 * Logs method, URL, status, and response time for all API requests.
 * Essential for security monitoring and debugging on VPS.
 */
export const requestLogger = morgan(
  ":method :url :status :response-time ms - :res[content-length]"
);
