import { Router } from "express";
import { DashboardController } from "../controllers/dashboardController.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/admin/summary", authMiddleware, roleMiddleware("ADMIN"), DashboardController.getAdminSummary);
router.get("/staff/summary", authMiddleware, DashboardController.getStaffSummary);

// Role-based summary endpoint
router.get("/summary", authMiddleware, DashboardController.getSummary);

// Recent activity (assignments & issues)
router.get("/activity", authMiddleware, DashboardController.getActivity);

export default router;
