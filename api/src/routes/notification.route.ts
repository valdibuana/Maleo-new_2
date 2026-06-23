import { Router } from "express";
import { getLatestNotifications } from "../controllers/notification.controller";
import { verifyJWT } from "../middleware/auth";

const router = Router();

// Endpoint: GET /api/notifications/latest
router.get("/latest", verifyJWT, getLatestNotifications);

export default router;
