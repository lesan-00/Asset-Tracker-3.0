import { Response } from "express";
import { z } from "zod";
import { AssignmentModel } from "../models/Assignment.js";
import {
  AcceptAssignmentSchema,
  AdminApproveReturnSchema,
  AdminRejectReturnSchema,
  CreateAssignmentSchema,
  RefuseAssignmentSchema,
  RevertAssignmentSchema,
  RequestReturnSchema,
} from "../types/schemas.js";
import { AssetModel } from "../models/Asset.js";
import { AuthRequest } from "../middleware/auth.js";
import { NotificationService } from "../services/notificationService.js";
import {
  AssignmentTargetType,
  isAccessoriesAllowedType,
} from "../constants/assignmentPolicies.js";
import { AssignmentService } from "../services/assignmentService.js";
import { getConnection } from "../database/connection.js";
import { v4 as uuidv4 } from "uuid";

const APPEND_NOTE_SEPARATOR = " | ";
const REQUIRED_TERMS_COUNT = 5;

const ListAssignmentsQuerySchema = z.object({
  status: z
    .enum([
      "PENDING_ACCEPTANCE",
      "ACTIVE",
      "REFUSED",
      "RETURN_REQUESTED",
      "RETURN_APPROVED",
      "RETURN_REJECTED",
      "CANCELLED",
      "REVERTED",
    ])
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

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
      const targetType: AssignmentTargetType = validated.targetType || "STAFF";
      const requestedBundleAssetIds = Array.from(
        new Set((validated.bundleAssetIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))
      );
      const parsedAssetId =
        validated.assetId ??
        (validated.laptopId && Number.isFinite(Number(validated.laptopId))
          ? Number(validated.laptopId)
          : undefined);

      if (!parsedAssetId || !Number.isInteger(parsedAssetId) || parsedAssetId <= 0) {
        return res.status(400).json({
          success: false,
          error: "Asset id is required",
        });
      }

      const asset = await AssetModel.findById(parsedAssetId);
      if (!asset) {
        return res.status(404).json({
          success: false,
          error: "Asset not found",
        });
      }
      const assetStatus = String((asset as any).status || "").toUpperCase();
      if (assetStatus !== "IN_STOCK") {
        return res.status(400).json({
          success: false,
          error: "Asset is not available for assignment",
        });
      }

      let staffId: string | undefined;
      let location: string | undefined;
      let department: string | undefined;

      if (targetType === "STAFF") {
        if (!validated.staffId) {
          return res.status(400).json({
            success: false,
            error: "staffId is required when targetType is STAFF",
          });
        }
        staffId = validated.staffId;
      } else if (targetType === "LOCATION") {
        const normalizedLocation = normalizeSpacing(validated.location || "");
        if (!normalizedLocation) {
          return res.status(400).json({
            success: false,
            error: "location is required when targetType is LOCATION",
          });
        }
        if (normalizedLocation.length < 2) {
          return res.status(400).json({
            success: false,
            error: "location must be at least 2 characters",
          });
        }
        location = normalizedLocation;
      } else if (targetType === "DEPARTMENT") {
        const normalizedDepartment = normalizeSpacing(validated.department || "");
        if (!normalizedDepartment) {
          return res.status(400).json({
            success: false,
            error: "department is required when targetType is DEPARTMENT",
          });
        }
        if (normalizedDepartment.length < 2) {
          return res.status(400).json({
            success: false,
            error: "department must be at least 2 characters",
          });
        }
        department = normalizedDepartment;
      }

      if (validated.accessoriesIssued?.length && !isAccessoriesAllowedType(asset.assetType)) {
        return res.status(400).json({
          success: false,
          error: `Accessories are not allowed for asset type ${asset.assetType}`,
        });
      }

      if (
        requestedBundleAssetIds.length > 0 &&
        (targetType !== "STAFF" || !["DESKTOP", "SYSTEM_UNIT"].includes(asset.assetType))
      ) {
        return res.status(400).json({
          success: false,
          error: "Bundle items are only supported for STAFF desktop assignments",
        });
      }

      const bundleAssetIds = requestedBundleAssetIds.filter((id) => id !== parsedAssetId);
      const groupId = bundleAssetIds.length > 0 ? uuidv4() : null;

      const assignmentIds: string[] = [];
      const assignedDate = validated.issueDate
        ? new Date(validated.issueDate)
        : validated.assignedDate
          ? new Date(validated.assignedDate)
          : new Date();
      const assignmentStatus = "ACTIVE";
      const conflictStatuses = [
        "PENDING_ACCEPTANCE",
        "ACTIVE",
        "RETURN_REQUESTED",
        "RETURN_REJECTED",
      ];

      const connection = await getConnection();
      try {
        await connection.beginTransaction();

        const assetIdsToAssign = [parsedAssetId, ...bundleAssetIds];
        for (const assetId of assetIdsToAssign) {
          const [assetRows] = await connection.execute(
            `SELECT id, asset_type as assetType, status
             FROM assets
             WHERE id = ?
             FOR UPDATE`,
            [assetId]
          );
          const currentAsset = Array.isArray(assetRows) ? (assetRows as any[])[0] : null;
          if (!currentAsset) {
            throw new Error(`Asset ${assetId} not found`);
          }
          const currentAssetStatus = String(currentAsset.status || "").toUpperCase();
          if (currentAssetStatus !== "IN_STOCK") {
            throw new Error(`Asset ${assetId} is not available for assignment`);
          }

          const [conflictRows] = await connection.execute(
            `SELECT id
             FROM assignments
             WHERE asset_id = ?
               AND status IN (?, ?, ?, ?)
             LIMIT 1
             FOR UPDATE`,
            [assetId, ...conflictStatuses]
          );
          const hasConflict = Array.isArray(conflictRows) && (conflictRows as any[]).length > 0;
          if (hasConflict) {
            throw new Error(`Asset ${assetId} already has an open assignment`);
          }

          if (assetId !== parsedAssetId) {
            const assetType = String(currentAsset.assetType || "").toUpperCase();
            if (!["MONITOR", "KEYBOARD", "MOUSE"].includes(assetType)) {
              throw new Error(`Asset ${assetId} cannot be used as a bundle item`);
            }
          }
        }

        for (let index = 0; index < assetIdsToAssign.length; index += 1) {
          const currentAssetId = assetIdsToAssign[index];
          const assignmentId = uuidv4();
          assignmentIds.push(assignmentId);

          await connection.execute(
            `INSERT INTO assignments (
              id,
              asset_id,
              group_id,
              target_type,
              staff_id,
              location,
              department,
              receiver_user_id,
              assigned_date,
              assigned_by,
              status,
              issue_condition_json,
              accessories_issued_json,
              notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              assignmentId,
              currentAssetId,
              groupId,
              targetType,
              staffId ?? null,
              location ?? null,
              department ?? null,
              null,
              assignedDate,
              req.user.userId,
              assignmentStatus,
              index === 0 && validated.issueCondition ? JSON.stringify(validated.issueCondition) : null,
              index === 0 && validated.accessoriesIssued
                ? JSON.stringify(validated.accessoriesIssued)
                : null,
              validated.notes ?? null,
            ]
          );
        }

        const placeholders = assetIdsToAssign.map(() => "?").join(", ");
        await connection.execute(
          `UPDATE assets
           SET status = 'ASSIGNED', updated_at = CURRENT_TIMESTAMP
           WHERE id IN (${placeholders})`,
          assetIdsToAssign
        );

        await connection.commit();
      } catch (transactionError) {
        await connection.rollback();
        throw transactionError;
      } finally {
        connection.release();
      }

      const assignment = await AssignmentModel.findById(assignmentIds[0]);
      if (!assignment) {
        return res.status(500).json({
          success: false,
          error: "Failed to create assignment",
        });
      }

      return res.status(201).json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      const statusCode = Number((error as any)?.statusCode || 400);
      return res.status(statusCode).json({
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

      if (req.user.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: "Access restricted to administrators",
        });
      }

      const parsed = ListAssignmentsQuerySchema.parse(req.query);
      const assignmentsPaged = await AssignmentModel.findAllWithDetailsPaginated(
        {
          status: parsed.status,
          search: parsed.search,
        },
        parsed.page,
        parsed.pageSize
      );

      const groupedAssignments = groupAssignmentsForResponse(assignmentsPaged.data);

      return res.json({
        success: true,
        data: groupedAssignments,
        page: assignmentsPaged.page,
        pageSize: assignmentsPaged.pageSize,
        total: assignmentsPaged.total,
        totalPages: assignmentsPaged.totalPages,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0]?.message || "Invalid query",
        });
      }
      return res.status(500).json({
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

      if (req.user.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: "Access restricted to administrators",
        });
      }

      return res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      return res.status(500).json({
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
      if (assignment.targetType !== "STAFF") {
        return res.status(400).json({
          success: false,
          error: "Only STAFF assignments can be accepted",
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
      const activeConflict = await AssignmentModel.findConflictingForAsset(
        assignment.assetId,
        ["ACTIVE", "RETURN_REQUESTED", "RETURN_REJECTED"],
        assignment.id
      );
      if (activeConflict) {
        return res.status(409).json({
          success: false,
          error: "Asset already has an active assignment",
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

      await AssetModel.update(assignment.assetId, { status: "ASSIGNED" });
      await NotificationService.markAssignmentNotificationsAsRead(assignment.id);

      return res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      const statusCode = Number((error as any)?.statusCode || 400);
      return res.status(statusCode).json({
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
      if (assignment.targetType !== "STAFF") {
        return res.status(400).json({
          success: false,
          error: "Only STAFF assignments can be refused",
        });
      }

      const now = new Date();
      const updated = await AssignmentModel.updateById(id, {
        status: "REFUSED",
        refusedAt: now,
        refusedReason: validated.reason || undefined,
      });

      await syncAssetStatusForAssignment(assignment.assetId, assignment.id);
      await NotificationService.markAssignmentNotificationsAsRead(assignment.id);

      return res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
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
      if (assignment.targetType !== "STAFF") {
        return res.status(400).json({
          success: false,
          error: "Return flow is only available for STAFF assignments",
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

      return res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
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

      await AssetModel.update(assignment.assetId, {
        status: validated.nextLaptopStatus,
      });

      return res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
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

      await syncAssetStatusForAssignment(assignment.assetId, assignment.id);

      return res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
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
      await syncAssetStatusForAssignment(assignment.assetId, assignment.id);
      await NotificationService.markAssignmentNotificationsAsRead(assignment.id);

      return res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async deleteAssignment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const connection = await getConnection();
      let assignmentAssetId: number | null = null;
      let assignmentFound = false;
      try {
        await connection.beginTransaction();
        const selectSql = `
          SELECT id, asset_id as assetId
          FROM assignments
          WHERE id = ?
          FOR UPDATE
        `;
        const selectParams = [id];
        const [rows] = await connection.execute(selectSql, selectParams);
        const assignment = Array.isArray(rows) ? (rows as any[])[0] : null;

        if (!assignment) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            error: "Assignment not found",
          });
        }
        assignmentFound = true;

        assignmentAssetId = assignment.assetId ? Number(assignment.assetId) : null;
        if (assignmentAssetId && Number.isInteger(assignmentAssetId) && assignmentAssetId > 0) {
          await connection.execute(
            `SELECT id, status FROM assets WHERE id = ? FOR UPDATE`,
            [assignmentAssetId]
          );
        }

        await connection.execute(`DELETE FROM assignments WHERE id = ?`, [id]);

        if (assignmentAssetId && Number.isInteger(assignmentAssetId) && assignmentAssetId > 0) {
          const [activeRows] = await connection.execute(
            `SELECT id
             FROM assignments
             WHERE asset_id = ?
               AND status IN ('PENDING_ACCEPTANCE', 'ACTIVE', 'RETURN_REQUESTED', 'RETURN_REJECTED')
             ORDER BY assigned_date DESC, created_at DESC
             LIMIT 1`,
            [assignmentAssetId]
          );
          const hasActive = Array.isArray(activeRows) && (activeRows as any[]).length > 0;
          if (hasActive) {
            await connection.execute(
              `UPDATE assets
               SET status = 'ASSIGNED', updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [assignmentAssetId]
            );
          } else {
            await connection.execute(
              `UPDATE assets
               SET status = CASE
                 WHEN status IN ('IN_REPAIR', 'RETIRED') THEN status
                 ELSE 'IN_STOCK'
               END,
               updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [assignmentAssetId]
            );
          }
        }

        await connection.commit();
      } catch (transactionError) {
        await connection.rollback();
        throw transactionError;
      } finally {
        connection.release();
      }

      if (!assignmentFound) {
        return res.status(404).json({
          success: false,
          error: "Assignment not found",
        });
      }
      return res.json({
        success: true,
        message: "Assignment deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }

  static async revertAssignment(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;
      const validated = RevertAssignmentSchema.parse(req.body ?? {});
      const reverted = await AssignmentService.revertAssignment({
        assignmentId: id,
        adminUserId: req.user.userId,
        adminEmail: req.user.email,
        reason: validated.reason,
      });

      if (!reverted) {
        return res.status(404).json({
          success: false,
          error: "Assignment not found",
        });
      }

      await NotificationService.markAssignmentNotificationsAsRead(id);

      return res.json({
        success: true,
        data: reverted.assignment,
        message: reverted.alreadyFinalized
          ? "Assignment was already finalized"
          : "Assignment reverted successfully",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
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

async function syncAssetStatusForAssignment(assetId: number, excludingAssignmentId?: string) {
  const stillAssigned = await AssignmentModel.hasAssignedStateForAsset(
    assetId,
    excludingAssignmentId
  );

  await AssetModel.update(assetId, {
    status: stillAssigned ? "ASSIGNED" : "IN_STOCK",
  });
}

function groupAssignmentsForResponse(assignments: any[]) {
  const grouped = new Map<string, any[]>();
  const standalone: any[] = [];

  for (const assignment of assignments) {
    if (assignment.groupId) {
      if (!grouped.has(assignment.groupId)) {
        grouped.set(assignment.groupId, []);
      }
      grouped.get(assignment.groupId)!.push(assignment);
    } else {
      standalone.push({ ...assignment, bundleAssets: [] });
    }
  }

  const groupedCards = Array.from(grouped.values()).map((items) => {
    const primary =
      items.find((item) =>
        ["DESKTOP", "SYSTEM_UNIT"].includes(String(item?.asset?.assetType || "").toUpperCase())
      ) || items[0];

    const bundleAssets = items
      .filter((item) => item.id !== primary.id)
      .map((item) => ({
        assignmentId: item.id,
        assetId: item.assetId,
        assetType: item.asset?.assetType,
        assetTag: item.asset?.assetTag,
        serialNumber: item.asset?.serialNumber,
        brand: item.asset?.brand,
        model: item.asset?.model,
        status: item.status,
      }));

    return {
      ...primary,
      bundleAssets,
    };
  });

  return [...groupedCards, ...standalone].sort(
    (a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
  );
}

function normalizeSpacing(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
