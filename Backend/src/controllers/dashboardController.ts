import { Response } from "express";
import { query } from "../database/connection.js";
import { AuthRequest } from "../middleware/auth.js";

export class DashboardController {
  static async getSummary(req: AuthRequest, res: Response) {
    try {
      if (req.user?.role === "ADMIN") {
        return DashboardController.getAdminSummary(req, res as Response);
      }
      return DashboardController.getStaffSummary(req, res as Response);
    } catch (error) {
      return res.status(500).json({ success: false, error: "Failed to load summary" });
    }
  }

  static async getAdminSummary(req: AuthRequest, res: Response) {
    try {
      const totalResult = await query(`SELECT COUNT(*) as total FROM assets`);
      const totalLaptops = Number((totalResult.rows as any[])[0]?.total || 0);

      const assignedResult = await query(
        `SELECT COUNT(DISTINCT a.asset_id) as assigned
         FROM assignments a
         WHERE a.status IN ('ACTIVE', 'RETURN_REQUESTED', 'RETURN_REJECTED')`
      );
      const assigned = Number((assignedResult.rows as any[])[0]?.assigned || 0);

      const underRepairResult = await query(
        `SELECT COUNT(*) as underRepair
         FROM assets
         WHERE status = 'IN_REPAIR'`
      );
      const underRepair = Number((underRepairResult.rows as any[])[0]?.underRepair || 0);

      const availableResult = await query(
        `SELECT COUNT(*) as available
         FROM assets
         WHERE status = 'IN_STOCK'`
      );
      const available = Number((availableResult.rows as any[])[0]?.available || 0);

      const issuesResult = await query(
        `SELECT COUNT(*) as openIssues
         FROM issues
         WHERE status IN ('OPEN', 'IN_PROGRESS')`
      );
      const openIssues = Number((issuesResult.rows as any[])[0]?.openIssues || 0);

      const pendingAcceptResult = await query(
        `SELECT COUNT(*) as pendingAccept
         FROM assignments
         WHERE status = 'PENDING_ACCEPTANCE'`
      );
      const pendingAcceptances = Number((pendingAcceptResult.rows as any[])[0]?.pendingAccept || 0);

      const pendingReturnResult = await query(
        `SELECT COUNT(*) as pendingReturns
         FROM assignments
         WHERE status = 'RETURN_REQUESTED'`
      );
      const pendingReturnApprovals = Number((pendingReturnResult.rows as any[])[0]?.pendingReturns || 0);

      return res.json({
        success: true,
        data: {
          role: "ADMIN",
          totalLaptops,
          available,
          assigned,
          underRepair,
          openIssues,
          pendingAcceptances,
          pendingReturnApprovals,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to load admin summary",
      });
    }
  }

  static async getStaffSummary(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.email || !req.user?.userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const assignmentResult = await query(
        `SELECT
           l.asset_tag as assetTag,
           l.serial_number as serialNumber,
           l.brand,
           l.model,
           CASE
             WHEN a.returned_date IS NULL THEN 'ASSIGNED'
             ELSE l.status
           END as status,
           l.warranty_end_date as warrantyExpiry,
           l.id as laptopId,
           a.accessories_issued_json as accessoriesIssuedJson
         FROM assignments a
         JOIN assets l ON l.id = a.asset_id
         WHERE a.receiver_user_id = ?
           AND a.status IN ('ACTIVE', 'RETURN_REQUESTED', 'RETURN_REJECTED')
         ORDER BY a.assigned_date DESC
         LIMIT 1`,
        [req.user.userId]
      );

      const row = (assignmentResult.rows as any[])[0];
      const openIssuesResult = await query(
        `SELECT COUNT(*) as count
         FROM issues i
         WHERE i.status IN ('OPEN', 'IN_PROGRESS')
           AND COALESCE(i.reported_by_user_id, i.reported_by) = ?`,
        [req.user.userId]
      );
      const myOpenIssuesCount = Number((openIssuesResult.rows as any[])[0]?.count || 0);

      const pendingAcceptResult = await query(
        `SELECT COUNT(*) as count
         FROM assignments
         WHERE receiver_user_id = ?
           AND status = 'PENDING_ACCEPTANCE'`,
        [req.user.userId]
      );
      const pendingReturnResult = await query(
        `SELECT COUNT(*) as count
         FROM assignments
         WHERE receiver_user_id = ?
           AND status = 'RETURN_REJECTED'`,
        [req.user.userId]
      );
      const pendingAcceptances = Number((pendingAcceptResult.rows as any[])[0]?.count || 0);
      const pendingReturnFollowUp = Number((pendingReturnResult.rows as any[])[0]?.count || 0);
      const myPendingActionsCount = pendingAcceptances + pendingReturnFollowUp;

      let assignedLaptop = null;
      if (row) {
        const parsedAccessories = safeParseArray(row.accessoriesIssuedJson);
        assignedLaptop = {
          assetTag: row.assetTag,
          serialNumber: row.serialNumber,
          brand: row.brand,
          model: row.model,
          status: row.status,
          warrantyExpiry: row.warrantyExpiry,
          accessoriesIssued: parsedAccessories,
        };
      }

      return res.json({
        success: true,
        data: {
          role: "STAFF",
          assignedLaptop,
          myOpenIssuesCount,
          myPendingActionsCount,
          pendingAcceptances,
          pendingReturnFollowUp,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to load staff summary",
      });
    }
  }

  static async getActivity(req: AuthRequest, res: Response) {
    try {
      const parsedLimit = Number(req.query.limit || 10);
      const limit = Number.isFinite(parsedLimit) ? Math.min(100, parsedLimit) : 10;

      const sql = `
        SELECT * FROM (
          SELECT
            CONCAT('assignment-created-', a.id) as id,
            'assignment' as category,
            'created' as action,
            a.assigned_by as actorId,
            IFNULL(u.full_name, '') as actorName,
            JSON_OBJECT('assignmentId', a.id, 'status', a.status, 'assetId', a.asset_id) as details,
            a.created_at as createdAt
          FROM assignments a
          LEFT JOIN users u ON u.id = a.assigned_by
          UNION ALL
          SELECT
            CONCAT('assignment-accepted-', a.id) as id,
            'assignment' as category,
            'accepted' as action,
            a.accepted_by_user_id as actorId,
            IFNULL(u_acc.full_name, '') as actorName,
            JSON_OBJECT('assignmentId', a.id, 'status', a.status, 'assetId', a.asset_id) as details,
            a.accepted_at as createdAt
          FROM assignments a
          LEFT JOIN users u_acc ON u_acc.id = a.accepted_by_user_id
          WHERE a.accepted_at IS NOT NULL
          UNION ALL
          SELECT
            CONCAT('assignment-refused-', a.id) as id,
            'assignment' as category,
            'refused' as action,
            a.receiver_user_id as actorId,
            IFNULL(u_ref.full_name, '') as actorName,
            JSON_OBJECT('assignmentId', a.id, 'reason', a.refused_reason, 'assetId', a.asset_id) as details,
            a.refused_at as createdAt
          FROM assignments a
          LEFT JOIN users u_ref ON u_ref.id = a.receiver_user_id
          WHERE a.refused_at IS NOT NULL
          UNION ALL
          SELECT
            CONCAT('return-requested-', a.id) as id,
            'assignment' as category,
            'return_requested' as action,
            a.return_requested_by_user_id as actorId,
            IFNULL(u_req.full_name, '') as actorName,
            JSON_OBJECT('assignmentId', a.id, 'assetId', a.asset_id) as details,
            a.return_requested_at as createdAt
          FROM assignments a
          LEFT JOIN users u_req ON u_req.id = a.return_requested_by_user_id
          WHERE a.return_requested_at IS NOT NULL
          UNION ALL
          SELECT
            CONCAT('return-approved-', a.id) as id,
            'assignment' as category,
            'return_approved' as action,
            a.return_approved_by_admin_id as actorId,
            IFNULL(u_appr.full_name, '') as actorName,
            JSON_OBJECT('assignmentId', a.id, 'assetId', a.asset_id) as details,
            a.return_approved_at as createdAt
          FROM assignments a
          LEFT JOIN users u_appr ON u_appr.id = a.return_approved_by_admin_id
          WHERE a.return_approved_at IS NOT NULL
          UNION ALL
          SELECT
            CONCAT('issue-created-', i.id) as id,
            'issue' as category,
            'created' as action,
            COALESCE(i.reported_by_user_id, i.reported_by) as actorId,
            IFNULL(u_issue.full_name, '') as actorName,
            JSON_OBJECT('issueId', i.id, 'title', i.title, 'status', i.status) as details,
            i.created_at as createdAt
          FROM issues i
          LEFT JOIN users u_issue ON u_issue.id = COALESCE(i.reported_by_user_id, i.reported_by)
          UNION ALL
          SELECT
            CONCAT('issue-resolved-', i.id) as id,
            'issue' as category,
            'resolved' as action,
            COALESCE(i.reported_by_user_id, i.reported_by) as actorId,
            IFNULL(u_res.full_name, '') as actorName,
            JSON_OBJECT('issueId', i.id, 'title', i.title, 'status', i.status) as details,
            i.updated_at as createdAt
          FROM issues i
          LEFT JOIN users u_res ON u_res.id = COALESCE(i.reported_by_user_id, i.reported_by)
          WHERE i.status IN ('RESOLVED', 'CLOSED')
        ) as events
        WHERE createdAt IS NOT NULL
        ORDER BY createdAt DESC
        LIMIT ${limit}
      `;

      const result = await query(sql);
      const rows = (result.rows as any[]) || [];

      const events = rows.map((r) => ({
        id: r.id,
        category: r.category,
        action: r.action,
        actorId: r.actorId,
        actorName: r.actorName,
        details: typeof r.details === 'string' ? JSON.parse(r.details || '{}') : r.details,
        createdAt: r.createdAt,
      }));

      return res.json({ success: true, data: events });
    } catch (error) {
      console.error('[Dashboard] getActivity error', error);
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to load activity' });
    }
  }
}

function safeParseArray(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}
