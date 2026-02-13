import { Router } from "express";
import { AssignmentController } from "../controllers/assignmentController.js";
import { roleMiddleware } from "../middleware/auth.js";

const router = Router();

// Admin-only operations
router.post("/", roleMiddleware("ADMIN"), AssignmentController.createAssignment);
router.post("/:id/admin-approve-return", roleMiddleware("ADMIN"), AssignmentController.approveReturn);
router.post("/:id/admin-reject-return", roleMiddleware("ADMIN"), AssignmentController.rejectReturn);
router.post("/:id/cancel", roleMiddleware("ADMIN"), AssignmentController.cancelPendingAssignment);
router.delete("/:id", roleMiddleware("ADMIN"), AssignmentController.deleteAssignment);

// All authenticated users can view assignments
router.get("/", AssignmentController.getAssignments);
router.get("/:id", AssignmentController.getAssignmentById);

// Staff receiver actions
router.post("/:id/accept", roleMiddleware("STAFF"), AssignmentController.acceptAssignment);
router.post("/:id/refuse", roleMiddleware("STAFF"), AssignmentController.refuseAssignment);
router.post("/:id/request-return", roleMiddleware("STAFF"), AssignmentController.requestReturn);

export default router;
