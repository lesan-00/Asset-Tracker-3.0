import { query } from "../database/connection.js";
import { Staff } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

export class StaffModel {
  static async create(data: {
    employeeName: string;
    epfNo?: string | null;
    email?: string;
    department?: string;
    location?: string;
    position?: string;
    status?: "ACTIVE" | "DISABLED";
    joinDate?: Date;
    phoneNumber?: string;
  }): Promise<Staff> {
    const id = uuidv4();
    const normalizedEpf = (data.epfNo || "").trim().toUpperCase();
    const resolvedEpf = normalizedEpf.length > 0 ? normalizedEpf : null;
    const fallbackEmailSeed = resolvedEpf ? resolvedEpf.toLowerCase() : id.toLowerCase();
    const resolvedEmail = (data.email || `${fallbackEmailSeed}@local.staff`).trim().toLowerCase();
    await query(
      `INSERT INTO staff (
        id, name, employee_name, epf_no, email, department, location, position, join_date, phone_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.employeeName,
        data.employeeName,
        resolvedEpf,
        resolvedEmail,
        data.department || "General",
        data.location || null,
        data.position || "Staff",
        data.joinDate || new Date(),
        data.phoneNumber || null,
        data.status || "ACTIVE",
      ]
    );
    return this.findById(id) as Promise<Staff>;
  }

  static async findAll(filters?: { search?: string; limit?: number }): Promise<Staff[]> {
    const where: string[] = [];
    const values: unknown[] = [];
    const term = (filters?.search || "").trim().toLowerCase();
    if (term) {
      where.push(
        "(LOWER(employee_name) LIKE ? OR LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(epf_no, '')) LIKE ? OR LOWER(id) LIKE ?)"
      );
      const pattern = `%${term}%`;
      values.push(pattern, pattern, pattern, pattern, pattern);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const safeLimit = Number.isFinite(filters?.limit) ? Math.max(1, Math.min(100, Number(filters?.limit))) : null;
    const limitSql = safeLimit ? `LIMIT ${safeLimit}` : "";

    const result = await query(
      `SELECT id, name, employee_name as employeeName, epf_no as epfNo, email, department, position,
              location,
              status, join_date as joinDate, phone_number as phoneNumber, created_at as createdAt, updated_at as updatedAt
       FROM staff
       ${whereSql}
       ORDER BY created_at DESC
       ${limitSql}`,
      values.length > 0 ? values : undefined
    );
    return (result.rows as any[]).map(row => this.mapRow(row));
  }

  static async findById(id: string): Promise<Staff | null> {
    const result = await query(
      `SELECT id, name, employee_name as employeeName, epf_no as epfNo, email, department, position,
              location,
              status, join_date as joinDate, phone_number as phoneNumber, created_at as createdAt, updated_at as updatedAt
       FROM staff WHERE id = ?`,
      [id]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async findByEmail(email: string): Promise<Staff | null> {
    const result = await query(
      `SELECT id, name, employee_name as employeeName, epf_no as epfNo, email, department, position,
              location,
              status, join_date as joinDate, phone_number as phoneNumber, created_at as createdAt, updated_at as updatedAt
       FROM staff WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [email]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async search(queryText: string): Promise<Array<{ id: string; label: string }>> {
    const term = queryText.trim().toLowerCase();
    const hasTerm = term.length > 0;
    const result = hasTerm
      ? await query(
          `SELECT id, employee_name as employeeName, epf_no as epfNo, email
           FROM staff
           WHERE LOWER(employee_name) LIKE ?
              OR LOWER(name) LIKE ?
              OR LOWER(email) LIKE ?
              OR LOWER(epf_no) LIKE ?
              OR LOWER(id) LIKE ?
           ORDER BY employee_name ASC
           LIMIT 20`,
          [`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`]
        )
      : await query(
          `SELECT id, employee_name as employeeName, epf_no as epfNo, email
           FROM staff
           ORDER BY employee_name ASC
           LIMIT 20`
        );

    return (result.rows as any[]).map((row) => ({
      id: String(row.id),
      label: `${row.employeeName}${row.epfNo ? ` (${row.epfNo})` : ""} - ${row.email}`,
    }));
  }

  static async findByEpfNo(epfNo: string): Promise<Staff | null> {
    const normalized = epfNo.trim().toUpperCase();
    if (!normalized) return null;
    const result = await query(
      `SELECT id, name, employee_name as employeeName, epf_no as epfNo, email, department, position,
              location,
              status, join_date as joinDate, phone_number as phoneNumber, created_at as createdAt, updated_at as updatedAt
       FROM staff
       WHERE UPPER(epf_no) = ?
       LIMIT 1`,
      [normalized]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async update(
    id: string,
      data: Partial<{
      name: string;
      employeeName: string;
      epfNo: string | null;
      email: string;
      department: string;
      location: string;
      position: string;
      status: "ACTIVE" | "DISABLED";
      joinDate: Date;
      phoneNumber?: string;
    }>
  ): Promise<Staff | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push(`name = ?`);
      values.push(data.name);
    }
    if (data.employeeName !== undefined) {
      updates.push(`employee_name = ?`);
      values.push(data.employeeName);
      if (data.name === undefined) {
        updates.push(`name = ?`);
        values.push(data.employeeName);
      }
    }
    if (data.epfNo !== undefined) {
      updates.push(`epf_no = ?`);
      const normalized = data.epfNo ? data.epfNo.trim().toUpperCase() : "";
      values.push(normalized.length > 0 ? normalized : null);
    }
    if (data.email !== undefined) {
      updates.push(`email = ?`);
      values.push(data.email);
    }
    if (data.department !== undefined) {
      updates.push(`department = ?`);
      values.push(data.department);
    }
    if (data.location !== undefined) {
      updates.push(`location = ?`);
      values.push(data.location);
    }
    if (data.position !== undefined) {
      updates.push(`position = ?`);
      values.push(data.position);
    }
    if (data.status !== undefined) {
      updates.push(`status = ?`);
      values.push(data.status);
    }
    if (data.joinDate !== undefined) {
      updates.push(`join_date = ?`);
      values.push(data.joinDate);
    }
    if (data.phoneNumber !== undefined) {
      updates.push(`phone_number = ?`);
      values.push(data.phoneNumber);
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);

    await query(
      `UPDATE staff SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const linkedAssignments = await query(
      `SELECT COUNT(*) as count FROM assignments WHERE staff_id = ?`,
      [id]
    );
    const linkedCount = Number((linkedAssignments.rows as any[])[0]?.count || 0);
    if (linkedCount > 0) {
      const conflictError = new Error(
        "Cannot delete staff member with existing assignments. Reassign or remove their assignments first."
      ) as Error & { code?: string };
      conflictError.code = "STAFF_HAS_ASSIGNMENTS";
      throw conflictError;
    }

    const result = await query(`DELETE FROM staff WHERE id = ?`, [id]);
    const affectedRows = Number((result.rows as any)?.affectedRows || 0);
    return affectedRows > 0;
  }

  private static mapRow(row: any): Staff {
    return {
      id: row.id,
      name: row.name,
      employeeName: row.employeeName || row.employee_name || row.name,
      epfNo: row.epfNo || row.epf_no || null,
      email: row.email,
      department: row.department,
      location: row.location || undefined,
      position: row.position,
      status: row.status || "ACTIVE",
      joinDate: new Date(row.joinDate || row.join_date),
      phoneNumber: row.phoneNumber || row.phone_number,
      createdAt: new Date(row.createdAt || row.created_at),
      updatedAt: new Date(row.updatedAt || row.updated_at),
    };
  }
}
