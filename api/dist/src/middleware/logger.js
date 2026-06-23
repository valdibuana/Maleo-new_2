"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const morgan_1 = __importDefault(require("morgan"));
/**
 * Request logging middleware using morgan.
 * Logs method, URL, status, and response time for all API requests.
 * Essential for security monitoring and debugging on VPS.
 */
exports.requestLogger = (0, morgan_1.default)(":method :url :status :response-time ms - :res[content-length]");
//# sourceMappingURL=logger.js.map