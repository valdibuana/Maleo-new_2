"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Endpoint: GET /api/notifications/latest
router.get("/latest", auth_1.verifyJWT, notification_controller_1.getLatestNotifications);
exports.default = router;
//# sourceMappingURL=notification.route.js.map