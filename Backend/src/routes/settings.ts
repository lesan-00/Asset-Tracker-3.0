import { Router } from "express";
import { SettingController } from "../controllers/settingController.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";

const router = Router();

// GET requires authentication (both ADMIN and STAFF can view)
router.get("/", authMiddleware, SettingController.getSettings);

// PUT requires authentication and ADMIN role
router.put("/", authMiddleware, roleMiddleware("ADMIN"), SettingController.saveSettings);

export default router;
