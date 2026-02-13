import { Router } from "express";
import { StaffController } from "../controllers/staffController.js";
import { roleMiddleware } from "../middleware/auth.js";

const router = Router();

// Admin-only operations
router.post("/", roleMiddleware("ADMIN"), StaffController.createStaff);
router.put("/:id", roleMiddleware("ADMIN"), StaffController.updateStaff);
router.delete("/:id", roleMiddleware("ADMIN"), StaffController.deleteStaff);

// Read operations for all authenticated users
router.get("/", StaffController.getStaff);
router.get("/:id", StaffController.getStaffById);

export default router;
