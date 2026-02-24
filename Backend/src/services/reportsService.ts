import { query } from "../database/connection.js";
import { AuthRequest } from "../middleware/auth.js";

export interface ReportUserContext {
  userId: string;
  role: "ADMIN" | "STAFF";
}

export interface AssetRegisterFilters {
  type?: string;
  status?: string;
  location?: string;
  department?: string;
  search?: string;
}

export interface ActiveAssignmentsFilters {
  targetType?: "STAFF" | "LOCATION" | "DEPARTMENT";
  search?: string;
}

export interface AssignmentHistoryFilters {
  from?: string;
  to?: string;
  search?: string;
}

export interface IssueSummaryFilters {
  from?: string;
  to?: string;
}

export interface IssueSummaryData {
  categoryCounts: Array<{ category: string; count: number }>;
  statusCounts: Array<{ status: string; count: number }>;
  assetTypeCounts: Array<{ assetType: string; count: number }>;
  problematicAssets: Array<{
    assetTag: string;
    assetType: string;
    imeiNo: string;
    brand: string;
    model: string;
    issuesCount: number;
  }>;
}

const STAFF_ACTIVE_ASSIGNMENT_STATUSES = [
  "PENDING_ACCEPTANCE",
  "ACTIVE",
  "RETURN_REQUESTED",
  "RETURN_REJECTED",
];

export class ReportsService {
  static async getAssetRegister(
    filters: AssetRegisterFilters,
    user: ReportUserContext
  ): Promise<Record<string, unknown>[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (user.role === "STAFF") {
      const placeholders = STAFF_ACTIVE_ASSIGNMENT_STATUSES.map(() => "?").join(", ");
      where.push(`
        EXISTS (
          SELECT 1
          FROM assignments a
          WHERE a.asset_id = ass.id
            AND a.receiver_user_id = ?
            AND a.status IN (${placeholders})
        )
      `);
      params.push(user.userId, ...STAFF_ACTIVE_ASSIGNMENT_STATUSES);
    }

    if (filters.type) {
      where.push("ass.asset_type = ?");
      params.push(filters.type);
    }
    if (filters.status) {
      where.push("ass.status = ?");
      params.push(filters.status);
    }
    if (filters.location) {
      where.push("ass.location = ?");
      params.push(filters.location);
    }
    if (filters.department) {
      where.push("ass.department = ?");
      params.push(filters.department);
    }
    if (filters.search) {
      where.push(`
        (
          LOWER(ass.asset_tag) LIKE ?
          OR LOWER(COALESCE(ass.imei_no, '')) LIKE ?
          OR LOWER(COALESCE(ass.serial_number, '')) LIKE ?
          OR LOWER(ass.brand) LIKE ?
          OR LOWER(ass.model) LIKE ?
        )
      `);
      const pattern = `%${filters.search.toLowerCase()}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = await query(
      `SELECT
         ass.asset_tag as assetTag,
         ass.asset_type as assetType,
         ass.brand,
         ass.model,
         ass.imei_no as imeiNo,
         ass.serial_number as serialNumber,
         ass.specifications,
         ass.department,
         ass.location,
         ass.status,
         ass.purchase_date as purchaseDate,
         ass.warranty_end_date as warrantyEndDate,
         ass.created_at as createdAt
       FROM assets ass
       ${whereSql}
       ORDER BY ass.created_at DESC`,
      params
    );
    return (result.rows as any[]).map((row) => ({ ...row }));
  }

  static async getActiveAssignments(
    filters: ActiveAssignmentsFilters,
    user: ReportUserContext
  ): Promise<Record<string, unknown>[]> {
    const where: string[] = ["a.status = 'ACTIVE'"];
    const params: unknown[] = [];

    if (user.role === "STAFF") {
      where.push("a.receiver_user_id = ?");
      params.push(user.userId);
    }
    if (filters.targetType) {
      where.push("a.target_type = ?");
      params.push(filters.targetType);
    }
    if (filters.search) {
      where.push(`
        (
          LOWER(ass.asset_tag) LIKE ?
          OR LOWER(COALESCE(ass.imei_no, '')) LIKE ?
          OR LOWER(COALESCE(ass.serial_number, '')) LIKE ?
          OR LOWER(ass.brand) LIKE ?
          OR LOWER(ass.model) LIKE ?
          OR LOWER(COALESCE(s.name, '')) LIKE ?
          OR LOWER(COALESCE(a.location, '')) LIKE ?
          OR LOWER(COALESCE(a.department, '')) LIKE ?
        )
      `);
      const pattern = `%${filters.search.toLowerCase()}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
    }

    const result = await query(
      `SELECT
         a.id as assignmentId,
         a.assigned_date as issuedDate,
         CASE
           WHEN a.accepted_at IS NULL THEN 'PENDING'
           ELSE 'ACCEPTED'
         END as acceptanceStatus,
         CASE
           WHEN a.return_requested_at IS NOT NULL THEN 'RETURN_REQUESTED'
           ELSE 'NOT_REQUESTED'
         END as returnStatus,
         a.target_type as targetType,
         CASE WHEN a.target_type = 'STAFF' THEN s.name ELSE NULL END as staffName,
         CASE WHEN a.target_type = 'DEPARTMENT' THEN a.department ELSE NULL END as department,
         CASE WHEN a.target_type = 'LOCATION' THEN a.location ELSE NULL END as location,
         ass.asset_tag as assetTag,
         ass.asset_type as assetType,
         ass.brand,
         ass.model,
         ass.imei_no as imeiNo,
         ass.serial_number as serialNumber,
         a.accessories_issued_json as accessoriesIssued
       FROM assignments a
       JOIN assets ass ON ass.id = a.asset_id
       LEFT JOIN staff s ON s.id = a.staff_id
       WHERE ${where.join(" AND ")}
       ORDER BY a.assigned_date DESC`,
      params
    );

    return (result.rows as any[]).map((row) => ({
      ...row,
      accessoriesIssued: normalizeAccessories(row.accessoriesIssued),
    }));
  }

  static async getIssueSummary(
    filters: IssueSummaryFilters,
    user: ReportUserContext
  ): Promise<IssueSummaryData> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.from) {
      where.push("i.created_at >= ?");
      params.push(filters.from);
    }
    if (filters.to) {
      where.push("i.created_at <= ?");
      params.push(`${filters.to} 23:59:59`);
    }
    if (user.role === "STAFF") {
      where.push(`
        EXISTS (
          SELECT 1
          FROM assignments a
          WHERE a.asset_id = i.asset_id
            AND a.receiver_user_id = ?
        )
      `);
      params.push(user.userId);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [categoryResult, statusResult, assetTypeResult, problematicResult] = await Promise.all([
      query(
        `SELECT COALESCE(i.category, 'UNCATEGORIZED') as category, COUNT(*) as count
         FROM issues i
         ${whereSql}
         GROUP BY COALESCE(i.category, 'UNCATEGORIZED')
         ORDER BY count DESC`,
        params
      ),
      query(
        `SELECT LOWER(i.status) as status, COUNT(*) as count
         FROM issues i
         ${whereSql}
         GROUP BY LOWER(i.status)
         ORDER BY count DESC`,
        params
      ),
      query(
        `SELECT ass.asset_type as assetType, COUNT(*) as count
         FROM issues i
         JOIN assets ass ON ass.id = i.asset_id
         ${whereSql}
         GROUP BY ass.asset_type
         ORDER BY count DESC`,
        params
      ),
      query(
        `SELECT
           ass.asset_tag as assetTag,
           ass.asset_type as assetType,
           ass.imei_no as imeiNo,
           ass.brand,
           ass.model,
           COUNT(*) as issuesCount
         FROM issues i
         JOIN assets ass ON ass.id = i.asset_id
         ${whereSql}
         GROUP BY ass.id, ass.asset_tag, ass.asset_type, ass.imei_no, ass.brand, ass.model
         ORDER BY issuesCount DESC
         LIMIT 10`,
        params
      ),
    ]);

    return {
      categoryCounts: (categoryResult.rows as any[]).map((row) => ({
        category: String(row.category),
        count: Number(row.count || 0),
      })),
      statusCounts: (statusResult.rows as any[]).map((row) => ({
        status: String(row.status),
        count: Number(row.count || 0),
      })),
      assetTypeCounts: (assetTypeResult.rows as any[]).map((row) => ({
        assetType: String(row.assetType),
        count: Number(row.count || 0),
      })),
      problematicAssets: (problematicResult.rows as any[]).map((row) => ({
        assetTag: String(row.assetTag || "-"),
        assetType: String(row.assetType || "-"),
        imeiNo: String(row.imeiNo || "-"),
        brand: String(row.brand || "-"),
        model: String(row.model || "-"),
        issuesCount: Number(row.issuesCount || 0),
      })),
    };
  }

  static async getAssignmentHistory(
    filters: AssignmentHistoryFilters,
    user: ReportUserContext
  ): Promise<Record<string, unknown>[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (user.role === "STAFF") {
      where.push("a.receiver_user_id = ?");
      params.push(user.userId);
    }
    if (filters.from) {
      where.push("a.assigned_date >= ?");
      params.push(filters.from);
    }
    if (filters.to) {
      where.push("a.assigned_date <= ?");
      params.push(`${filters.to} 23:59:59`);
    }
    if (filters.search) {
      where.push(`
        (
          LOWER(ass.asset_tag) LIKE ?
          OR LOWER(COALESCE(ass.imei_no, '')) LIKE ?
          OR LOWER(COALESCE(ass.serial_number, '')) LIKE ?
          OR LOWER(ass.brand) LIKE ?
          OR LOWER(ass.model) LIKE ?
          OR LOWER(COALESCE(s.name, '')) LIKE ?
          OR LOWER(a.id) LIKE ?
        )
      `);
      const pattern = `%${filters.search.toLowerCase()}%`;
      params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = await query(
      `SELECT
         a.id as assignmentId,
         a.status,
         a.target_type as targetType,
         ass.asset_tag as assetTag,
         ass.asset_type as assetType,
         ass.brand,
         ass.model,
         ass.imei_no as imeiNo,
         ass.serial_number as serialNumber,
         CASE WHEN a.target_type = 'STAFF' THEN s.name ELSE NULL END as staffName,
         CASE WHEN a.target_type = 'DEPARTMENT' THEN a.department ELSE NULL END as department,
         CASE WHEN a.target_type = 'LOCATION' THEN a.location ELSE NULL END as location,
         a.assigned_date as issuedDate,
         a.accepted_at as acceptedAt,
         a.refused_at as refusedAt,
         a.return_requested_at as returnRequestedAt,
         a.return_approved_at as returnApprovedAt,
         a.return_rejected_at as returnRejectedAt,
         a.reverted_at as revertedAt,
         a.returned_date as returnedDate,
         u_assign.email as assignedBy,
         u_accept.email as acceptedBy,
         u_ret_req.email as returnRequestedBy,
         u_ret_app.email as returnApprovedBy,
         u_revert.email as revertedBy,
         a.revert_reason as revertReason
       FROM assignments a
       JOIN assets ass ON ass.id = a.asset_id
       LEFT JOIN staff s ON s.id = a.staff_id
       LEFT JOIN users u_assign ON u_assign.id = a.assigned_by
       LEFT JOIN users u_accept ON u_accept.id = a.accepted_by_user_id
       LEFT JOIN users u_ret_req ON u_ret_req.id = a.return_requested_by_user_id
       LEFT JOIN users u_ret_app ON u_ret_app.id = a.return_approved_by_admin_id
       LEFT JOIN users u_revert ON u_revert.id = a.reverted_by_user_id
       ${whereSql}
       ORDER BY a.assigned_date DESC`,
      params
    );

    return (result.rows as any[]).map((row) => ({ ...row }));
  }

  static fromAuth(req: AuthRequest): ReportUserContext {
    return {
      userId: req.user!.userId,
      role: req.user!.role,
    };
  }
}

function normalizeAccessories(value: unknown): string {
  if (!value) return "-";
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) {
      const clean = parsed.map((item) => String(item).trim()).filter(Boolean);
      return clean.length ? clean.join(" • ") : "-";
    }
    return String(value);
  } catch {
    return String(value);
  }
}
