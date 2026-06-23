import { Router } from "express";
import { verifyJWT } from "../middleware/auth";
import { authorizeLMS } from "../middleware/lms-guard";
import { uploadMaterial } from "../lib/multer";
import * as lmsController from "../controllers/lms.controller";

const router = Router();

// Apply auth and LMS authorization to all routes
router.use(verifyJWT);
router.use(authorizeLMS);

// FILTER DATA
router.get("/subjects", lmsController.getSubjects);
router.get("/classes", lmsController.getClasses);

// MODULES
router.get("/modules", lmsController.getModules);
router.post("/modules", lmsController.createModule);
router.put("/modules/:id", lmsController.updateModule);
router.delete("/modules/:id", lmsController.deleteModule);

// SESSIONS
router.post("/sessions", lmsController.createSession);
router.put("/sessions/:id", lmsController.updateSession);
router.delete("/sessions/:id", lmsController.deleteSession);

// MATERIALS
router.get("/materials", lmsController.getMaterials);
router.post("/materials/upload", uploadMaterial.single("file"), lmsController.uploadMaterialFile);
router.post("/materials/upload-link", lmsController.createLinkMaterial);
router.delete("/materials/:id", lmsController.deleteMaterial);
router.post("/materials/:id/access", lmsController.trackAccess);

export default router;
