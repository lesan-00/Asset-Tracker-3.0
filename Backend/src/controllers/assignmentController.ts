import { Response } from "express";
import { AssignmentModel } from "../models/Assignment.js";
import {
  AcceptAssignmentSchema,
  AdminApproveReturnSchema,
  AdminRejectReturnSchema,
  CreateAssignmentSchema,
  RefuseAssignmentSchema,
  RequestReturnSchema,
} from "../types/schemas.js";
import { LaptopModel } from "../models/Laptop.js";
import { AuthRequest } from "../middleware/auth.js";

const APPEND_NOTE_SEPARATOR = " | ";
const REQUIRED_TERMS_COUNT = 5;

export class AssignmentController {
  static async createAssignment(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const validated = CreateAssignmentSchema.parse(req.body);
      const receiverUserId = await AssignmentModel.findReceiverUserIdForStaff(validated.staffId);
      if (!receiverUserId) {
        return res.status(400).json({
          success: false,
          error: "Selected receiver does not have a linked user account",
        });
      }

      const laptop = await LaptopModel.findById(validated.laptopId);
      if (!laptop) {
        return res.status(404).json({
          success: false,
          error: "Laptop not found",
        });
      }
      if (laptop.status !== "AVAILABLE") {
        return res.status(400).json({
          success: false,
          error: "Laptop is not available for assignment",
        });
      }

      const conflict = await AssignmentModel.findConflictingForLaptop(validated.laptopId, [
        "PENDING_ACCEPTANCE",
        "ACTIVE",
        "RETURN_REQUESTED",
        "RETURN_REJECTED",
      ]);
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: "Laptop already has an open assignment",
        });
      }

      const assignment = await AssignmentModel.create({
        laptopId: validated.laptopId,
        staffId: validated.staffId,
        receiverUserId,
        assignedBy: req.user.userId,
        assignedDate: new Date(validated.assignedDate),
        issueConditionJson: validated.issueCondition
          ? JSON.stringify(validated.issueCondition)
          : null,
        accessoriesIssuedJson: validated.accessoriesIssued
          ? JSON.stringify(validated.accessoriesIssued)
          : null,
        notes: validated.notes,
      });

      res.status(201).json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async getAssignments(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      let assignments;
      if (req.user.role === "ADMIN") {
        assignments = await AssignmentModel.findAllWithDetails();
      } else {
        await AssignmentModel.backfillReceiverUserIdByEmail(req.user.userId, req.user.email);
        assignments = await AssignmentModel.findAllWithDetails({
          receiverUserId: req.user.userId,
        });
      }

      res.json({
        success: true,
        data: assignments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }

  static async getAssignmentById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;
      const assignment = await AssignmentModel.findById(id);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: "Assignment not found",
        });
      }

      if (
        req.user.role !== "ADMIN" &&
        assignment.receiverUserId !== req.user.userId
      ) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }

  static async acceptAssignment(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;
      const validated = AcceptAssignmentSchema.parse(req.body);
      const assignment = await AssignmentModel.findById(id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: "Assignment not found",
        });
      }
      if (assignment.receiverUserId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: "Only the designated receiver can accept this assignment",
        });
      }
      if (assignment.status !== "PENDING_ACCEPTANCE") {
        return res.status(400).json({
          success: false,
          error: "Only pending assignments can be accepted",
        });
      }
      if (!validated.acceptedTerms.every((item) => item === true)) {
        return res.status(400).json({
          success: false,
          error: "All required terms must be accepted",
        });
      }
      if (validated.acceptedTerms.length < REQUIRED_TERMS_COUNT) {
        return res.status(400).json({
          success: false,
          error: "Missing required terms acknowledgement",
        });
      }

      const now = new Date();
      const activeConflict = await AssignmentModel.findConflictingForLaptop(
        assignment.laptopId,
        ["ACTIVE", "RETURN_REQUESTED", "RETURN_REJECTED"],
        assignment.id
      );
      if (activeConflict) {
        return res.status(409).json({
          success: false,
          error: "Laptop already has an active assignment",
        });
      }

      const updated = await AssignmentModel.updateById(id, {
        status: "ACTIVE",
        termsVersion: validated.termsVersion,
        termsAccepted: true,
        termsAcceptedAt: now,
        acceptedByUserId: req.user.userId,
        acceptedAt: now,
      });

      await LaptopModel.update(assignment.laptopId, { status: "ASSIGNED" });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async refuseAssignment(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;
      const validated = RefuseAssignmentSchema.parse(req.body);
      const assignment = await AssignmentModel.findById(id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: "Assignment not found",
        });
      }
      if (assignment.receiverUserId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: "Only the designated receiver can refuse this assignment",
        });
      }
      if (assignment.status !== "PENDING_ACCEPTANCE") {
        return res.status(400).json({
          success: false,
          error: "Only pending assignments can be refused",
        });
      }

      const now = new Date();
      const updated = await AssignmentModel.updateById(id, {
        status: "REFUSED",
        refusedAt: now,
        refusedReason: validated.reason || undefined,
      });

      await syncLaptopStatusForAssignment(assignment.laptopId, assignment.id);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async requestReturn(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;
      const validated = RequestReturnSchema.parse(req.body);
      const assignment = await AssignmentModel.findById(id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: "Assignment not found",
        });
      }
      if (assignment.receiverUserId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: "Only the designated receiver can request return",
        });
      }
      if (assignment.status !== "ACTIVE" && assignment.status !== "RETURN_REJECTED") {
        return res.status(400).json({
          success: false,
          error: "Only active or return-rejected assignments can request return",
        });
      }

      const now = new Date();
      const updated = await AssignmentModel.updateById(id, {
        status: "RETURN_REQUESTED",
        returnRequestedAt: now,
        returnRequestedByUserId: req.user.userId,
        returnConditionJson: validated.returnCondition
          ? JSON.stringify(validated.returnCondition)
          : assignment.returnConditionJson || "",
        accessoriesReturnedJson: validated.accessoriesReturned
          ? JSON.stringify(validated.accessoriesReturned)
          : assignment.accessoriesReturnedJson || "",
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async approveReturn(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;
      const validated = AdminApproveReturnSchema.parse(req.body);
      const assignment = await AssignmentModel.findById(id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: "Assignment not found",
        });
      }
      if (assignment.status !== "RETURN_REQUESTED") {
        return res.status(400).json({
          success: false,
          error: "Only return-requested assignments can be approved",
        });
      }

      const now = new Date();
      const updated = await AssignmentModel.updateById(id, {
        status: "RETURN_APPROVED",
        returnApprovedAt: now,
        returnApprovedByAdminId: req.user.userId,
        returnedDate: now,
        returnConditionJson: JSON.stringify(validated.finalReturnCondition),
        accessoriesReturnedJson: JSON.stringify(validated.finalAccessoriesReturned),
        notes: appendDecisionNote(assignment.notes, validated.decisionNote),
      });

      await LaptopModel.update(assignment.laptopId, {
        status:
          validated.nextLaptopStatus === "AVAILABLE" ? "AVAILABLE" : "MAINTENANCE",
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async rejectReturn(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;
      const validated = AdminRejectReturnSchema.parse(req.body);
      const assignment = await AssignmentModel.findById(id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: "Assignment not found",
        });
      }
      if (assignment.status !== "RETURN_REQUESTED") {
        return res.status(400).json({
          success: false,
          error: "Only return-requested assignments can be rejected",
        });
      }

      const now = new Date();
      const updated = await AssignmentModel.updateById(id, {
        status: "RETURN_REJECTED",
        returnRejectedAt: now,
        returnRejectedReason: validated.reason,
        notes: appendDecisionNote(assignment.notes, `Return rejected: ${validated.reason}`),
      });

      await syncLaptopStatusForAssignment(assignment.laptopId, assignment.id);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async cancelPendingAssignment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const assignment = await AssignmentModel.findById(id);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: "Assignment not found",
        });
      }
      if (assignment.status !== "PENDING_ACCEPTANCE") {
        return res.status(400).json({
          success: false,
          error: "Only pending assignments can be cancelled",
        });
      }

      const updated = await AssignmentModel.updateById(id, {
        status: "CANCELLED",
      });
      await syncLaptopStatusForAssignment(assignment.laptopId, assignment.id);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async deleteAssignment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await AssignmentModel.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Assignment not found",
        });
      }
      res.json({
        success: true,
        message: "Assignment deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }
}

function appendDecisionNote(existing: string | undefined, decisionNote?: string): string {
  if (!decisionNote || !decisionNote.trim()) {
    return existing || "";
  }
  if (!existing || !existing.trim()) {
    return decisionNote.trim();
  }
  return `${existing}${APPEND_NOTE_SEPARATOR}${decisionNote.trim()}`;
}

async function syncLaptopStatusForAssignment(laptopId: string, excludingAssignmentId?: string) {
  const stillAssigned = await AssignmentModel.hasAssignedStateForLaptop(
    laptopId,
    excludingAssignmentId
  );

  await LaptopModel.update(laptopId, {
    status: stillAssigned ? "ASSIGNED" : "AVAILABLE",
  });
}
