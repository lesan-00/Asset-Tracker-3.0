import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { NotificationService } from "../services/notificationService.js";

export class NotificationController {
  static async getNotifications(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId || !req.user.role) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const notifications = await NotificationService.getUserNotifications(req.user.userId);

      return res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to load notifications",
      });
    }
  }

  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId || !req.user.role) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const unreadCount = await NotificationService.getUnreadCount(req.user.userId);

      return res.json({
        success: true,
        data: { unreadCount },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to load unread count",
      });
    }
  }

  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const notificationId = Number(req.params.id);
      if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid notification id",
        });
      }

      const updated = await NotificationService.markAsRead(req.user.userId, notificationId);
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: "Notification not found",
        });
      }

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to mark notification as read",
      });
    }
  }

  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const updatedCount = await NotificationService.markAllAsRead(req.user.userId);
      return res.json({ success: true, data: { updatedCount } });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to mark all notifications as read",
      });
    }
  }
}
