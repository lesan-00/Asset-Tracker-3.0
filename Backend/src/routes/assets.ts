import { Router } from "express";
import { AssetController } from "../controllers/assetController.js";
import { roleMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/summary", roleMiddleware("ADMIN"), AssetController.getSummary);
router.get("/import/template", roleMiddleware("ADMIN"), AssetController.downloadImportTemplate);
router.post("/import/preview", roleMiddleware("ADMIN"), AssetController.previewImportAssets);
router.post("/import", roleMiddleware("ADMIN"), AssetController.importAssets);
router.get("/assignable", roleMiddleware("ADMIN"), AssetController.getAssignableAssets);
router.get("/search", roleMiddleware("ADMIN"), AssetController.searchAssets);
router.get("/", roleMiddleware("ADMIN"), AssetController.getAssets);
router.get("/:id", roleMiddleware("ADMIN"), AssetController.getAssetById);

router.post("/", roleMiddleware("ADMIN"), AssetController.createAsset);
router.put("/:id", roleMiddleware("ADMIN"), AssetController.updateAsset);
router.delete("/:id", roleMiddleware("ADMIN"), AssetController.deleteAsset);

export default router;
