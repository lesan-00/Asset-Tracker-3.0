import { query } from "../database/connection.js";
import { Issue } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";
type IssuePriority = "low" | "medium" | "high" | "critical";

export interface IssueListFilters {
  search?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assignedToUserId?: string;
}

export interface IssueListItem {
  id: string;
  laptopId: string;
  assetId?: number;
  title: string;
  description: string;
  category: string;
  status: IssueStatus;
  priority: IssuePriority;
  reportedByUserId: string;
  createdByUserId?: string;
  reportedForStaffId?: string;
  reportedForUserId?: string;
  assignedTo?: string;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  laptop?: {
    assetTag?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
  };
  reporter?: {
    id: string;
    fullName?: string;
    email?: string;
  };
  reportedFor?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export interface PaginatedIssueResult {
  data: IssueListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const toDbStatus = (status: IssueStatus): string => status.toUpperCase();
const toDbPriority = (priority: IssuePriority): string => priority.toUpperCase();

const normalizeStatus = (status: string): IssueStatus => {
  const value = status.toUpperCase();
  if (value === "IN_PROGRESS") return "in_progress";
  if (value === "RESOLVED") return "resolved";
  if (value === "CLOSED") return "closed";
  return "open";
};

const normalizePriority = (priority: string): IssuePriority => {
  const value = priority.toUpperCase();
  if (value === "CRITICAL") return "critical";
  if (value === "HIGH") return "high";
  if (value === "LOW") return "low";
  return "medium";
};

export class IssueModel {
  static async create(data: {
    assetId: string;
    title: string;
    description: string;
    category: string;
    priority: IssuePriority;
    status?: IssueStatus;
    createdByUserId: string;
    reportedForStaffId?: string | null;
  }): Promise<IssueListItem> {
    const assetId = Number(data.assetId);
    if (!Number.isInteger(assetId) || assetId <= 0) {
      throw new Error("Invalid asset id");
    }

    const id = uuidv4();
    await query(
      `INSERT INTO issues (
        id, asset_id, laptop_id, title, description, category, priority, status,
        reported_by_user_id, reported_by, created_by_user_id, reported_for_staff_id, reported_for_user_id, reported_date
      )
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP)`,
      [
        id,
        assetId,
        data.title,
        data.description,
        data.category,
        toDbPriority(data.priority),
        toDbStatus(data.status || "open"),
        data.createdByUserId,
        data.createdByUserId,
        data.createdByUserId,
        data.reportedForStaffId ?? null,
      ]
    );

    const issue = await this.findByIdForViewer(id, {
      role: "ADMIN",
      userId: data.createdByUserId,
      email: "",
    });
    return issue as IssueListItem;
  }

  static async findForViewer(
    viewer: { role: "ADMIN" | "STAFF"; userId: string; email: string },
    filters: IssueListFilters
  ): Promise<IssueListItem[]> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    if (viewer.role !== "ADMIN") {
      whereClauses.push(
        `(
          i.reported_for_user_id = ?
          OR EXISTS (
            SELECT 1
            FROM assignments a
            JOIN staff s ON s.id = a.staff_id
            WHERE a.asset_id = i.asset_id
              AND a.returned_date IS NULL
              AND s.email = ?
          )
        )`
      );
      values.push(viewer.userId, viewer.email);
    }

    if (filters.assignedToUserId) {
      whereClauses.push(
        `(i.reported_for_user_id = ? OR EXISTS (
            SELECT 1
            FROM assignments a_assign
            WHERE a_assign.asset_id = i.asset_id
              AND a_assign.receiver_user_id = ?
          ))`
      );
      values.push(filters.assignedToUserId, filters.assignedToUserId);
    }

    if (filters.search) {
      whereClauses.push(
        `(
          i.title LIKE ?
          OR i.description LIKE ?
          OR COALESCE(i.category, '') LIKE ?
          OR COALESCE(l.asset_tag, '') LIKE ?
          OR COALESCE(l.brand, '') LIKE ?
          OR COALESCE(l.model, '') LIKE ?
        )`
      );
      const pattern = `%${filters.search}%`;
      values.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }

    if (filters.status) {
      whereClauses.push(`i.status = ?`);
      values.push(toDbStatus(filters.status));
    }

    if (filters.priority) {
      whereClauses.push(`i.priority = ?`);
      values.push(toDbPriority(filters.priority));
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const result = await query(
      `SELECT
         i.id,
         COALESCE(CAST(i.asset_id AS CHAR), i.laptop_id) as laptopId,
         i.title,
         i.description,
         i.category,
         i.status,
         i.priority,
         COALESCE(i.reported_by_user_id, i.reported_by) as reportedByUserId,
         i.created_by_user_id as createdByUserId,
         i.reported_for_staff_id as reportedForStaffId,
         i.reported_for_user_id as reportedForUserId,
         i.assigned_to as assignedTo,
         i.resolution_notes as resolutionNotes,
         i.created_at as createdAt,
         i.updated_at as updatedAt,
         l.asset_tag as laptopAssetTag,
         l.brand as laptopBrand,
         l.model as laptopModel,
         l.serial_number as laptopSerialNumber,
         u.id as reporterId,
         u.full_name as reporterName,
         u.email as reporterEmail,
         s_reported_for.id as reportedForId,
         s_reported_for.name as reportedForName,
         s_reported_for.email as reportedForEmail
       FROM issues i
       LEFT JOIN assets l ON l.id = i.asset_id
       LEFT JOIN users u ON u.id = COALESCE(i.reported_by_user_id, i.reported_by)
       LEFT JOIN staff s_reported_for ON s_reported_for.id = i.reported_for_staff_id
       ${whereSQL}
       ORDER BY i.created_at DESC`,
      values
    );

    return (result.rows as any[]).map((row) => this.mapRowWithRelations(row));
  }

  static async findForViewerPaginated(
    viewer: { role: "ADMIN" | "STAFF"; userId: string; email: string },
    filters: IssueListFilters,
    page: number,
    pageSize: number
  ): Promise<PaginatedIssueResult> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    if (viewer.role !== "ADMIN") {
      whereClauses.push(
        `(
          i.reported_for_user_id = ?
          OR EXISTS (
            SELECT 1
            FROM assignments a
            JOIN staff s ON s.id = a.staff_id
            WHERE a.asset_id = i.asset_id
              AND a.returned_date IS NULL
              AND s.email = ?
          )
        )`
      );
      values.push(viewer.userId, viewer.email);
    }

    if (filters.assignedToUserId) {
      whereClauses.push(
        `(i.reported_for_user_id = ? OR EXISTS (
            SELECT 1
            FROM assignments a_assign
            WHERE a_assign.asset_id = i.asset_id
              AND a_assign.receiver_user_id = ?
          ))`
      );
      values.push(filters.assignedToUserId, filters.assignedToUserId);
    }

    if (filters.search) {
      whereClauses.push(
        `(
          i.title LIKE ?
          OR i.description LIKE ?
          OR COALESCE(i.category, '') LIKE ?
          OR COALESCE(l.asset_tag, '') LIKE ?
          OR COALESCE(l.brand, '') LIKE ?
          OR COALESCE(l.model, '') LIKE ?
        )`
      );
      const pattern = `%${filters.search}%`;
      values.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }

    if (filters.status) {
      whereClauses.push(`i.status = ?`);
      values.push(toDbStatus(filters.status));
    }

    if (filters.priority) {
      whereClauses.push(`i.priority = ?`);
      values.push(toDbPriority(filters.priority));
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const safePageSize = Math.max(1, Math.min(100, Math.floor(pageSize)));
    const safePage = Math.max(1, Math.floor(page));
    const offset = (safePage - 1) * safePageSize;

    const totalResult = await query(
      `SELECT COUNT(*) AS total
       FROM issues i
       LEFT JOIN assets l ON l.id = i.asset_id
       ${whereSQL}`,
      values.length > 0 ? values : undefined
    );
    const total = Number((totalResult.rows as any[])[0]?.total || 0);

    const result = await query(
      `SELECT
         i.id,
         COALESCE(CAST(i.asset_id AS CHAR), i.laptop_id) as laptopId,
         i.title,
         i.description,
         i.category,
         i.status,
         i.priority,
         COALESCE(i.reported_by_user_id, i.reported_by) as reportedByUserId,
         i.created_by_user_id as createdByUserId,
         i.reported_for_staff_id as reportedForStaffId,
         i.reported_for_user_id as reportedForUserId,
         i.assigned_to as assignedTo,
         i.resolution_notes as resolutionNotes,
         i.created_at as createdAt,
         i.updated_at as updatedAt,
         l.asset_tag as laptopAssetTag,
         l.brand as laptopBrand,
         l.model as laptopModel,
         l.serial_number as laptopSerialNumber,
         u.id as reporterId,
         u.full_name as reporterName,
         u.email as reporterEmail,
         s_reported_for.id as reportedForId,
         s_reported_for.name as reportedForName,
         s_reported_for.email as reportedForEmail
       FROM issues i
       LEFT JOIN assets l ON l.id = i.asset_id
       LEFT JOIN users u ON u.id = COALESCE(i.reported_by_user_id, i.reported_by)
       LEFT JOIN staff s_reported_for ON s_reported_for.id = i.reported_for_staff_id
       ${whereSQL}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, safePageSize, offset]
    );

    return {
      data: (result.rows as any[]).map((row) => this.mapRowWithRelations(row)),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  static async findByIdForViewer(
    issueId: string,
    viewer: { role: "ADMIN" | "STAFF"; userId: string; email: string }
  ): Promise<IssueListItem | null> {
    const whereClauses: string[] = ["i.id = ?"];
    const values: unknown[] = [issueId];

    if (viewer.role !== "ADMIN") {
      whereClauses.push(
        `(
          i.reported_for_user_id = ?
          OR EXISTS (
            SELECT 1
            FROM assignments a
            JOIN staff s ON s.id = a.staff_id
            WHERE a.asset_id = i.asset_id
              AND a.returned_date IS NULL
              AND LOWER(s.email) = LOWER(?)
          )
        )`
      );
      values.push(viewer.userId, viewer.email);
    }

    const result = await query(
      `SELECT
         i.id,
         COALESCE(CAST(i.asset_id AS CHAR), i.laptop_id) as laptopId,
         i.title,
         i.description,
         i.category,
         i.status,
         i.priority,
         COALESCE(i.reported_by_user_id, i.reported_by) as reportedByUserId,
         i.created_by_user_id as createdByUserId,
         i.reported_for_staff_id as reportedForStaffId,
         i.reported_for_user_id as reportedForUserId,
         i.assigned_to as assignedTo,
         i.resolution_notes as resolutionNotes,
         i.created_at as createdAt,
         i.updated_at as updatedAt,
         l.asset_tag as laptopAssetTag,
         l.brand as laptopBrand,
         l.model as laptopModel,
         l.serial_number as laptopSerialNumber,
         u.id as reporterId,
         u.full_name as reporterName,
         u.email as reporterEmail,
         s_reported_for.id as reportedForId,
         s_reported_for.name as reportedForName,
         s_reported_for.email as reportedForEmail
       FROM issues i
       LEFT JOIN assets l ON l.id = i.asset_id
       LEFT JOIN users u ON u.id = COALESCE(i.reported_by_user_id, i.reported_by)
       LEFT JOIN staff s_reported_for ON s_reported_for.id = i.reported_for_staff_id
       WHERE ${whereClauses.join(" AND ")}
       LIMIT 1`,
      values
    );

    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRowWithRelations(rows[0]) : null;
  }

  static async update(
    id: string,
    data: Partial<{
      status: IssueStatus;
      assignedTo?: string;
      resolutionNotes?: string;
    }>
  ): Promise<Issue | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.status !== undefined) {
      updates.push(`status = ?`);
      values.push(toDbStatus(data.status));
    }
    if (data.assignedTo !== undefined) {
      updates.push(`assigned_to = ?`);
      values.push(data.assignedTo || null);
    }
    if (data.resolutionNotes !== undefined) {
      updates.push(`resolution_notes = ?`);
      values.push(data.resolutionNotes || null);
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);

    await query(
      `UPDATE issues SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query(`DELETE FROM issues WHERE id = ?`, [id]);
    return result.rowCount > 0;
  }

  static async findById(id: string): Promise<Issue | null> {
    const result = await query(
      `SELECT id, asset_id as assetId, COALESCE(CAST(asset_id AS CHAR), laptop_id) as laptopId, title, description, category, status, priority,
              COALESCE(reported_by_user_id, reported_by) as reportedByUserId, created_by_user_id as createdByUserId,
              reported_for_staff_id as reportedForStaffId, reported_for_user_id as reportedForUserId,
              assigned_to as assignedTo, resolution_notes as resolutionNotes,
              created_at as createdAt, updated_at as updatedAt
       FROM issues WHERE id = ? LIMIT 1`,
      [id]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  private static mapRow(row: any): Issue {
    return {
      id: row.id,
      laptopId: row.laptopId || row.laptop_id,
      assetId: row.assetId || row.asset_id || undefined,
      title: row.title,
      description: row.description,
      category: row.category || "GENERAL",
      status: normalizeStatus(row.status),
      priority: normalizePriority(row.priority),
      reportedByUserId: row.reportedByUserId || row.reported_by_user_id || row.reported_by,
      createdByUserId:
        row.createdByUserId || row.created_by_user_id || row.reportedByUserId || row.reported_by_user_id || row.reported_by,
      reportedForStaffId: row.reportedForStaffId || row.reported_for_staff_id || undefined,
      reportedForUserId: row.reportedForUserId || row.reported_for_user_id || undefined,
      assignedTo: row.assignedTo || row.assigned_to || undefined,
      resolutionNotes: row.resolutionNotes || row.resolution_notes || undefined,
      createdAt: new Date(row.createdAt || row.created_at),
      updatedAt: new Date(row.updatedAt || row.updated_at),
    };
  }

  private static mapRowWithRelations(row: any): IssueListItem {
    return {
      ...this.mapRow(row),
      laptop: {
        assetTag: row.laptopAssetTag,
        brand: row.laptopBrand,
        model: row.laptopModel,
        serialNumber: row.laptopSerialNumber,
      },
      reporter: {
        id: row.reporterId || row.reportedByUserId || row.reported_by_user_id || row.reported_by,
        fullName: row.reporterName,
        email: row.reporterEmail,
      },
      reportedFor: row.reportedForId
        ? {
            id: row.reportedForId,
            name: row.reportedForName,
            email: row.reportedForEmail,
          }
        : undefined,
    };
  }
}
