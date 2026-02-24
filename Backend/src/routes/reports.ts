import { Router } from "express";
import { ReportsController } from "../controllers/reportsController.js";
import { roleMiddleware } from "../middleware/auth.js";

const router = Router();

router.get(
  "/assets/register",
  roleMiddleware("ADMIN"),
  ReportsController.getAssetRegister
);
router.get(
  "/assets/register/export",
  roleMiddleware("ADMIN"),
  ReportsController.exportAssetRegister
);

router.get(
  "/assignments/active",
  roleMiddleware("ADMIN"),
  ReportsController.getActiveAssignments
);
router.get(
  "/assignments/active/export",
  roleMiddleware("ADMIN"),
  ReportsController.exportActiveAssignments
);

router.get(
  "/issues/summary",
  roleMiddleware("ADMIN"),
  ReportsController.getIssueSummary
);
router.get(
  "/issues/summary/export",
  roleMiddleware("ADMIN"),
  ReportsController.exportIssueSummary
);

router.get(
  "/assignments/history",
  roleMiddleware("ADMIN"),
  ReportsController.getAssignmentHistory
);
router.get(
  "/assignments/history/export",
  roleMiddleware("ADMIN"),
  ReportsController.exportAssignmentHistory
);

export default router;
