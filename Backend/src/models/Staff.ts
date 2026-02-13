import { query } from "../database/connection.js";
import { Staff } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

export class StaffModel {
  static async create(data: {
    name: string;
    email: string;
    department: string;
    position: string;
    joinDate: Date;
    phoneNumber?: string;
  }): Promise<Staff> {
    const id = uuidv4();
    await query(
      `INSERT INTO staff (id, name, email, department, position, join_date, phone_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.email,
        data.department,
        data.position,
        data.joinDate,
        data.phoneNumber || null,
      ]
    );
    return this.findById(id) as Promise<Staff>;
  }

  static async findAll(): Promise<Staff[]> {
    const result = await query(
      `SELECT id, name, email, department, position, join_date as joinDate,
              phone_number as phoneNumber, created_at as createdAt, updated_at as updatedAt
       FROM staff ORDER BY created_at DESC`
    );
    return (result.rows as any[]).map(row => this.mapRow(row));
  }

  static async findById(id: string): Promise<Staff | null> {
    const result = await query(
      `SELECT id, name, email, department, position, join_date as joinDate,
              phone_number as phoneNumber, created_at as createdAt, updated_at as updatedAt
       FROM staff WHERE id = ?`,
      [id]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async findByEmail(email: string): Promise<Staff | null> {
    const result = await query(
      `SELECT id, name, email, department, position, join_date as joinDate,
              phone_number as phoneNumber, created_at as createdAt, updated_at as updatedAt
       FROM staff WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [email]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async update(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      department: string;
      position: string;
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
    if (data.email !== undefined) {
      updates.push(`email = ?`);
      values.push(data.email);
    }
    if (data.department !== undefined) {
      updates.push(`department = ?`);
      values.push(data.department);
    }
    if (data.position !== undefined) {
      updates.push(`position = ?`);
      values.push(data.position);
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
    const result = await query(`DELETE FROM staff WHERE id = ?`, [id]);
    return result.rowCount > 0;
  }

  private static mapRow(row: any): Staff {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      department: row.department,
      position: row.position,
      joinDate: new Date(row.joinDate || row.join_date),
      phoneNumber: row.phoneNumber || row.phone_number,
      createdAt: new Date(row.createdAt || row.created_at),
      updatedAt: new Date(row.updatedAt || row.updated_at),
    };
  }
}
