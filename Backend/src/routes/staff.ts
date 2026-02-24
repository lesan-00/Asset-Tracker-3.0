import { Router } from "express";
import { StaffController } from "../controllers/staffController.js";
import { roleMiddleware } from "../middleware/auth.js";

const router = Router();

// Admin-only operations
router.post("/", roleMiddleware("ADMIN"), StaffController.createStaff);
router.put("/:id", roleMiddleware("ADMIN"), StaffController.updateStaff);
router.patch("/:id", roleMiddleware("ADMIN"), StaffController.updateStaff);
router.delete("/:id", roleMiddleware("ADMIN"), StaffController.deleteStaff);

// Read operations - admin only
router.get("/search", roleMiddleware("ADMIN"), StaffController.searchStaff);
router.get("/", roleMiddleware("ADMIN"), StaffController.getStaff);
router.get("/:id", roleMiddleware("ADMIN"), StaffController.getStaffById);

export default router;
