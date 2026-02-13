import { query } from "../database/connection.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  userCode: string;
  username: string;
  location: string;
  department: string;
  phoneNumber: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  fullName: string;
  userCode: string;
  username: string;
  location: string;
  department: string;
  phoneNumber: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  createdAt: Date;
}

export class UserModel {
  static async create(data: {
    email: string;
    password: string;
    fullName: string;
    userCode: string;
    username: string;
    location: string;
    department: string;
    phoneNumber: string;
    role?: "ADMIN" | "STAFF";
  }): Promise<UserPublic> {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(data.password, 10);
    const role = data.role || "STAFF";

    await query(
      `INSERT INTO users (id, email, password_hash, full_name, userCode, username, location, department, phoneNumber, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
      [
        id,
        data.email,
        passwordHash,
        data.fullName,
        data.userCode,
        data.username,
        data.location,
        data.department,
        data.phoneNumber,
        role,
      ]
    );

    const user = await this.findById(id);
    return user as UserPublic;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, password_hash as passwordHash, full_name as fullName,
              userCode, username, location, department, phoneNumber,
              role, is_active as isActive, created_at as createdAt, updated_at as updatedAt
       FROM users WHERE email = ? AND is_active = true`,
      [email]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async findById(id: string): Promise<UserPublic | null> {
    const result = await query(
      `SELECT id, email, full_name as fullName, userCode, username, location,
              department, phoneNumber, role, is_active as isActive, created_at as createdAt
       FROM users WHERE id = ? AND is_active = true`,
      [id]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRowPublic(rows[0]) : null;
  }

  static async findAll(): Promise<UserPublic[]> {
    const result = await query(
      `SELECT id, email, full_name as fullName, userCode, username, location,
              department, phoneNumber, role, is_active as isActive, created_at as createdAt
       FROM users WHERE is_active = true ORDER BY created_at DESC`
    );
    return (result.rows as any[]).map(row => this.mapRowPublic(row));
  }

  static async update(
    id: string,
    data: Partial<{
      email: string;
      fullName: string;
      userCode: string;
      username: string;
      location: string;
      department: string;
      phoneNumber: string;
      role: "ADMIN" | "STAFF";
      isActive: boolean;
    }>
  ): Promise<UserPublic | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.email !== undefined) {
      updates.push(`email = ?`);
      values.push(data.email);
    }
    if (data.fullName !== undefined) {
      updates.push(`full_name = ?`);
      values.push(data.fullName);
    }
    if (data.userCode !== undefined) {
      updates.push(`userCode = ?`);
      values.push(data.userCode);
    }
    if (data.username !== undefined) {
      updates.push(`username = ?`);
      values.push(data.username);
    }
    if (data.location !== undefined) {
      updates.push(`location = ?`);
      values.push(data.location);
    }
    if (data.department !== undefined) {
      updates.push(`department = ?`);
      values.push(data.department);
    }
    if (data.phoneNumber !== undefined) {
      updates.push(`phoneNumber = ?`);
      values.push(data.phoneNumber);
    }
    if (data.role !== undefined) {
      updates.push(`role = ?`);
      values.push(data.role);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = ?`);
      values.push(data.isActive);
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);

    await query(
      `UPDATE users SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async updatePassword(id: string, newPassword: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [passwordHash, id]
    );
    return true;
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  static async deactivate(id: string): Promise<boolean> {
    const result = await query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    return result.rowCount > 0;
  }

  static async findByRole(role: "ADMIN" | "STAFF"): Promise<UserPublic[]> {
    const result = await query(
      `SELECT id, email, full_name as fullName, userCode, username, location,
              department, phoneNumber, role, is_active as isActive, created_at as createdAt
       FROM users WHERE role = ? AND is_active = true ORDER BY created_at DESC`,
      [role]
    );
    return (result.rows as any[]).map(row => this.mapRowPublic(row));
  }

  static async findByUserCode(userCode: string): Promise<UserPublic | null> {
    const result = await query(
      `SELECT id, email, full_name as fullName, userCode, username, location,
              department, phoneNumber, role, is_active as isActive, created_at as createdAt
       FROM users WHERE userCode = ? AND is_active = true`,
      [userCode]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRowPublic(rows[0]) : null;
  }

  static async findByUsername(username: string): Promise<UserPublic | null> {
    const result = await query(
      `SELECT id, email, full_name as fullName, userCode, username, location,
              department, phoneNumber, role, is_active as isActive, created_at as createdAt
       FROM users WHERE username = ? AND is_active = true`,
      [username]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRowPublic(rows[0]) : null;
  }

  private static mapRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash || row.password_hash,
      fullName: row.fullName || row.full_name,
      userCode: row.userCode || row.user_code,
      username: row.username,
      location: row.location,
      department: row.department,
      phoneNumber: row.phoneNumber || row.phone_number,
      role: row.role,
      isActive: row.isActive || row.is_active,
      createdAt: new Date(row.createdAt || row.created_at),
      updatedAt: new Date(row.updatedAt || row.updated_at),
    };
  }

  private static mapRowPublic(row: any): UserPublic {
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName || row.full_name,
      userCode: row.userCode || row.user_code,
      username: row.username,
      location: row.location,
      department: row.department,
      phoneNumber: row.phoneNumber || row.phone_number,
      role: row.role,
      isActive: row.isActive || row.is_active,
      createdAt: new Date(row.createdAt || row.created_at),
    };
  }
}
