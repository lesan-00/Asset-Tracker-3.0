import { query } from "../database/connection.js";
import { Issue } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";
type IssuePriority = "low" | "medium" | "high" | "critical";

export interface IssueListFilters {
  search?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
}

export interface IssueListItem {
  id: string;
  laptopId: string;
  title: string;
  description: string;
  category: string;
  status: IssueStatus;
  priority: IssuePriority;
  reportedByUserId: string;
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
    laptopId: string;
    title: string;
    description: string;
    category: string;
    priority: IssuePriority;
    status?: IssueStatus;
    reportedByUserId: string;
  }): Promise<IssueListItem> {
    const id = uuidv4();
    await query(
      `INSERT INTO issues (
        id, laptop_id, title, description, category, priority, status,
        reported_by_user_id, reported_by, reported_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        id,
        data.laptopId,
        data.title,
        data.description,
        data.category,
        toDbPriority(data.priority),
        toDbStatus(data.status || "open"),
        data.reportedByUserId,
        data.reportedByUserId,
      ]
    );

    const issue = await this.findByIdForViewer(id, {
      role: "ADMIN",
      userId: data.reportedByUserId,
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
          COALESCE(i.reported_by_user_id, i.reported_by) = ?
          OR EXISTS (
            SELECT 1
            FROM assignments a
            JOIN staff s ON s.id = a.staff_id
            WHERE a.laptop_id = i.laptop_id
              AND a.returned_date IS NULL
              AND LOWER(s.email) = LOWER(?)
          )
        )`
      );
      values.push(viewer.userId, viewer.email);
    }

    if (filters.search) {
      whereClauses.push(
        `(
          LOWER(i.title) LIKE ?
          OR LOWER(i.description) LIKE ?
          OR LOWER(COALESCE(i.category, '')) LIKE ?
          OR LOWER(COALESCE(l.asset_tag, '')) LIKE ?
          OR LOWER(COALESCE(l.brand, '')) LIKE ?
          OR LOWER(COALESCE(l.model, '')) LIKE ?
        )`
      );
      const pattern = `%${filters.search.toLowerCase()}%`;
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
         i.laptop_id as laptopId,
         i.title,
         i.description,
         i.category,
         i.status,
         i.priority,
         COALESCE(i.reported_by_user_id, i.reported_by) as reportedByUserId,
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
         u.email as reporterEmail
       FROM issues i
       LEFT JOIN laptops l ON l.id = i.laptop_id
       LEFT JOIN users u ON u.id = COALESCE(i.reported_by_user_id, i.reported_by)
       ${whereSQL}
       ORDER BY i.created_at DESC`,
      values
    );

    return (result.rows as any[]).map((row) => this.mapRowWithRelations(row));
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
          COALESCE(i.reported_by_user_id, i.reported_by) = ?
          OR EXISTS (
            SELECT 1
            FROM assignments a
            JOIN staff s ON s.id = a.staff_id
            WHERE a.laptop_id = i.laptop_id
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
         i.laptop_id as laptopId,
         i.title,
         i.description,
         i.category,
         i.status,
         i.priority,
         COALESCE(i.reported_by_user_id, i.reported_by) as reportedByUserId,
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
         u.email as reporterEmail
       FROM issues i
       LEFT JOIN laptops l ON l.id = i.laptop_id
       LEFT JOIN users u ON u.id = COALESCE(i.reported_by_user_id, i.reported_by)
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
      `SELECT id, laptop_id as laptopId, title, description, category, status, priority,
              COALESCE(reported_by_user_id, reported_by) as reportedByUserId,
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
      title: row.title,
      description: row.description,
      category: row.category || "GENERAL",
      status: normalizeStatus(row.status),
      priority: normalizePriority(row.priority),
      reportedByUserId: row.reportedByUserId || row.reported_by_user_id || row.reported_by,
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
    };
  }
}
