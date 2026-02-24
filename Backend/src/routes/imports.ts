import { Router } from "express";
import { roleMiddleware } from "../middleware/auth.js";
import { ImportController } from "../controllers/importController.js";

const router = Router();

router.get("/staff/template", roleMiddleware("ADMIN"), ImportController.downloadStaffTemplate);
router.post("/staff/preview", roleMiddleware("ADMIN"), ImportController.previewStaffImport);
router.post("/staff/confirm", roleMiddleware("ADMIN"), ImportController.confirmStaffImport);

export default router;

