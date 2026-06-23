"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_1 = require("../middleware/auth");
const role_1 = require("../middleware/role");
const router = (0, express_1.Router)();
// Protected route: Admin & Kepala Sekolah
router.get("/summary", auth_1.verifyJWT, (0, role_1.checkRole)("admin", "kepala_sekolah"), dashboard_controller_1.getDashboardSummary);
exports.default = router;
//# sourceMappingURL=dashboard.route.js.map