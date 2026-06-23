import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller";
import { verifyJWT } from "../middleware/auth";
import { checkRole } from "../middleware/role";

const router = Router();

// Protected route: Admin & Kepala Sekolah
router.get("/summary", verifyJWT, checkRole("admin", "kepala_sekolah"), getDashboardSummary);

export default router;
