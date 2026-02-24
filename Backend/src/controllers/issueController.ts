import { Response } from "express";
import { z } from "zod";
import { IssueModel } from "../models/Issue.js";
import { CreateIssueSchema, UpdateIssueSchema } from "../types/schemas.js";
import { AuthRequest } from "../middleware/auth.js";
import { NotificationService } from "../services/notificationService.js";
import { AssetModel } from "../models/Asset.js";
import { StaffModel } from "../models/Staff.js";

const ListIssuesQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedToUserId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export class IssueController {
  static async createIssue(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: "Only admin users can report issues",
        });
      }

      const validated = CreateIssueSchema.parse(req.body);
      const assetId = Number(validated.assetId);
      const asset = await AssetModel.findById(assetId);
      if (!asset) {
        return res.status(404).json({
          success: false,
          error: "Asset not found",
        });
      }

      let reportedForStaffId: string | null = null;
      let reportedForStaffName: string | undefined;
      if (validated.reportedForStaffId) {
        const staff = await StaffModel.findById(validated.reportedForStaffId);
        if (!staff) {
          return res.status(400).json({
            success: false,
            error: "Reported For staff record not found",
          });
        }
        reportedForStaffId = staff.id;
        reportedForStaffName = staff.name;
      }

      const issue = await IssueModel.create({
        assetId: validated.assetId,
        title: validated.title,
        description: validated.description,
        category: validated.category,
        priority: validated.priority,
        status: validated.status,
        createdByUserId: req.user.userId,
        reportedForStaffId,
      });

      try {
        await NotificationService.createIssueReportedNotifications({
          issueId: issue.id,
          issueTitle: issue.title,
          reportedByUserId: req.user.userId,
        });
      } catch (notificationError) {
        console.error("[Notifications] Failed to create ISSUE_REPORTED notifications:", notificationError);
      }

      try {
        await AssetModel.logActivity({
          action: "ISSUE_REPORTED",
          entityType: "ASSET",
          entityId: String(asset.id),
          message: reportedForStaffName
            ? `Issue reported by Admin for ${reportedForStaffName} on asset ${asset.assetTag}`
            : `Issue reported by Admin on asset ${asset.assetTag}`,
        });
      } catch (activityError) {
        console.error("[IssueController] Failed to write issue activity log:", activityError);
      }

      return res.status(201).json({
        success: true,
        data: issue,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0].message,
        });
      }

      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create issue",
      });
    }
  }

  static async getIssues(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      const parsedQuery = ListIssuesQuerySchema.parse(req.query);
      const issues = await IssueModel.findForViewerPaginated(
        {
          role: req.user.role,
          userId: req.user.userId,
          email: req.user.email,
        },
        {
          search: parsedQuery.search,
          status: parsedQuery.status,
          priority: parsedQuery.priority,
          assignedToUserId: parsedQuery.assignedToUserId,
        },
        parsedQuery.page,
        parsedQuery.pageSize
      );

      return res.json({
        success: true,
        data: issues.data,
        page: issues.page,
        pageSize: issues.pageSize,
        total: issues.total,
        totalPages: issues.totalPages,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0].message,
        });
      }

      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch issues",
      });
    }
  }

  static async getIssueById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      const { id } = req.params;
      const issue = await IssueModel.findByIdForViewer(id, {
        role: req.user.role,
        userId: req.user.userId,
        email: req.user.email,
      });

      if (!issue) {
        return res.status(404).json({
          success: false,
          error: "Issue not found",
        });
      }

      return res.json({
        success: true,
        data: issue,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch issue",
      });
    }
  }

  static async updateIssue(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      if (req.user.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: "Access denied: Admin role required",
        });
      }

      const { id } = req.params;
      const validated = UpdateIssueSchema.parse(req.body);

      const issue = await IssueModel.update(id, validated);
      if (!issue) {
        return res.status(404).json({
          success: false,
          error: "Issue not found",
        });
      }

      return res.json({
        success: true,
        data: issue,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0].message,
        });
      }

      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update issue",
      });
    }
  }

  static async deleteIssue(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      if (req.user.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: "Access denied: Admin role required",
        });
      }

      const { id } = req.params;
      const deleted = await IssueModel.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Issue not found",
        });
      }

      return res.json({
        success: true,
        message: "Issue deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete issue",
      });
    }
  }
}
