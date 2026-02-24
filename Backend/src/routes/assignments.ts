import { Router } from "express";
import { AssignmentController } from "../controllers/assignmentController.js";
import { roleMiddleware } from "../middleware/auth.js";

const router = Router();

// Admin-only operations
router.post("/", roleMiddleware("ADMIN"), AssignmentController.createAssignment);
router.get("/", roleMiddleware("ADMIN"), AssignmentController.getAssignments);
router.get("/:id", roleMiddleware("ADMIN"), AssignmentController.getAssignmentById);
router.post("/:id/admin-approve-return", roleMiddleware("ADMIN"), AssignmentController.approveReturn);
router.post("/:id/admin-reject-return", roleMiddleware("ADMIN"), AssignmentController.rejectReturn);
router.post("/:id/cancel", roleMiddleware("ADMIN"), AssignmentController.cancelPendingAssignment);
router.post("/:id/revert", roleMiddleware("ADMIN"), AssignmentController.revertAssignment);
router.delete("/:id", roleMiddleware("ADMIN"), AssignmentController.deleteAssignment);

export default router;
