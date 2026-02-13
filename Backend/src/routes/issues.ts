import { Router } from "express";
import { IssueController } from "../controllers/issueController.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

// All authenticated users can create issues
router.post("/", IssueController.createIssue);
router.get("/", IssueController.getIssues);
router.get("/:id", IssueController.getIssueById);

// Admin-only operations
router.patch("/:id", requireRole(["ADMIN"]), IssueController.updateIssue);
router.put("/:id", requireRole(["ADMIN"]), IssueController.updateIssue);
router.delete("/:id", requireRole(["ADMIN"]), IssueController.deleteIssue);

export default router;
