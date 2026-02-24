import { query } from "../database/connection.js";

export interface NotificationItem {
  id: string;
  title: string;
  recipientUserId: string;
  type: string;
  entityType: string;
  entityId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export class NotificationService {
  static async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    const result = await query(
      `SELECT
         id,
         title,
         recipient_user_id as recipientUserId,
         type,
         entity_type as entityType,
         entity_id as entityId,
         message,
         is_read as isRead,
         created_at as createdAt
       FROM notifications
       WHERE recipient_user_id = ?
       ORDER BY is_read ASC, created_at DESC
       LIMIT 30`,
      [userId]
    );

    const rows = result.rows as any[];
    console.log(`[Notifications] list userId=${userId}, rows=${rows.length}`);
    return rows.map((row) => ({
      id: String(row.id),
      title: String(row.title || "Notification"),
      recipientUserId: String(row.recipientUserId),
      type: String(row.type),
      entityType: String(row.entityType),
      entityId: String(row.entityId),
      message: String(row.message),
      isRead: Boolean(row.isRead),
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE recipient_user_id = ?
         AND is_read = 0`,
      [userId]
    );
    const count = Number((result.rows as any[])[0]?.count || 0);
    console.log(`[Notifications] unread-count userId=${userId}, count=${count}`);
    return count;
  }

  static async markAsRead(userId: string, notificationId: number): Promise<boolean> {
    const result = await query(
      `UPDATE notifications
       SET is_read = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND recipient_user_id = ?`,
      [notificationId, userId]
    );
    return result.rowCount > 0;
  }

  static async markAllAsRead(userId: string): Promise<number> {
    const result = await query(
      `UPDATE notifications
       SET is_read = 1, updated_at = CURRENT_TIMESTAMP
       WHERE recipient_user_id = ?
         AND is_read = 0`,
      [userId]
    );
    return result.rowCount;
  }

  static async createAssignmentPendingNotifications(data: {
    assignmentId: string;
    receiverUserId?: string | null;
    assignedBy?: string | null;
    assetTag: string;
  }): Promise<void> {
    if (data.receiverUserId) {
      await query(
        `INSERT IGNORE INTO notifications (
           recipient_user_id, title, type, entity_type, entity_id, message, is_read
         ) VALUES (?, ?, 'ASSIGNMENT_PENDING_ACCEPTANCE', 'ASSIGNMENT', ?, ?, 0)`,
        [
          data.receiverUserId,
          "Assignment Pending Acceptance",
          data.assignmentId,
          `Assignment ${data.assetTag} is pending your acceptance`,
        ]
      );
    }

    if (data.assignedBy) {
      await query(
        `INSERT IGNORE INTO notifications (
           recipient_user_id, title, type, entity_type, entity_id, message, is_read
         ) VALUES (?, ?, 'ASSIGNMENT_AWAITING_ACCEPTANCE', 'ASSIGNMENT', ?, ?, 0)`,
        [
          data.assignedBy,
          "Assignment Awaiting Acceptance",
          data.assignmentId,
          `Assignment ${data.assetTag} is awaiting staff acceptance`,
        ]
      );
    }
  }

  static async createIssueReportedNotifications(data: {
    issueId: string;
    issueTitle: string;
    reportedByUserId: string;
  }): Promise<void> {
    const sanitizedTitle = (data.issueTitle || "").trim().slice(0, 120) || "Untitled issue";
    await query(
      `INSERT IGNORE INTO notifications (
         recipient_user_id, title, type, entity_type, entity_id, message, is_read
       )
       SELECT
         u.id,
         'New Issue Reported',
         'ISSUE_REPORTED',
         'ISSUE',
         ?,
         ?,
         0
       FROM users u
       WHERE u.role = 'ADMIN'
         AND u.is_active = true
         AND u.id <> ?`,
      [
        data.issueId,
        `Issue #${data.issueId} was reported: ${sanitizedTitle}`,
        data.reportedByUserId,
      ]
    );
  }

  static async markAssignmentNotificationsAsRead(assignmentId: string): Promise<void> {
    await query(
      `UPDATE notifications
       SET is_read = 1, updated_at = CURRENT_TIMESTAMP
       WHERE entity_type = 'ASSIGNMENT'
         AND entity_id = ?
         AND type IN ('ASSIGNMENT_PENDING_ACCEPTANCE', 'ASSIGNMENT_AWAITING_ACCEPTANCE')
         AND is_read = 0`,
      [assignmentId]
    );
  }
}
