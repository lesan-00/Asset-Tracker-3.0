import { Response } from "express";
import { z } from "zod";
import { IssueModel } from "../models/Issue.js";
import { CreateIssueSchema, UpdateIssueSchema } from "../types/schemas.js";
import { AuthRequest } from "../middleware/auth.js";

const ListIssuesQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
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

      const validated = CreateIssueSchema.parse(req.body);
      const issue = await IssueModel.create({
        laptopId: validated.laptopId,
        title: validated.title,
        description: validated.description,
        category: validated.category,
        priority: validated.priority,
        status: validated.status,
        reportedByUserId: req.user.userId,
      });

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

      const issues = await IssueModel.findForViewer(
        {
          role: req.user.role,
          userId: req.user.userId,
          email: req.user.email,
        },
        parsedQuery
      );

      return res.json({
        success: true,
        data: issues,
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
