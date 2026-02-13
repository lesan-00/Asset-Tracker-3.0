import { query } from "../database/connection.js";
import { v4 as uuidv4 } from "uuid";

export interface Accessory {
  id: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LaptopAccessory {
  id: string;
  laptopId: string;
  accessoryId: string;
  quantity: number;
  addedDate: Date;
  accessory?: Accessory;
}

export class AccessoryModel {
  static async create(data: {
    name: string;
    category: string;
    description?: string;
  }): Promise<Accessory> {
    const id = uuidv4();
    await query(
      `INSERT INTO accessories (id, name, category, description, is_active)
       VALUES (?, ?, ?, ?, true)`,
      [id, data.name, data.category, data.description || null]
    );

    const accessory = await this.findById(id);
    return accessory as Accessory;
  }

  static async findById(id: string): Promise<Accessory | null> {
    const result = await query(
      `SELECT id, name, category, description, is_active as isActive, 
              created_at as createdAt, updated_at as updatedAt
       FROM accessories WHERE id = ?`,
      [id]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async findAll(activeOnly = true): Promise<Accessory[]> {
    const whereClause = activeOnly ? "WHERE is_active = true" : "";
    const result = await query(
      `SELECT id, name, category, description, is_active as isActive, 
              created_at as createdAt, updated_at as updatedAt
       FROM accessories ${whereClause} ORDER BY name ASC`
    );
    return (result.rows as any[]).map(row => this.mapRow(row));
  }

  static async findByCategory(category: string): Promise<Accessory[]> {
    const result = await query(
      `SELECT id, name, category, description, is_active as isActive, 
              created_at as createdAt, updated_at as updatedAt
       FROM accessories WHERE category = ? AND is_active = true ORDER BY name`,
      [category]
    );
    return (result.rows as any[]).map(row => this.mapRow(row));
  }

  static async update(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      description: string;
      isActive: boolean;
    }>
  ): Promise<Accessory | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push(`name = ?`);
      values.push(data.name);
    }
    if (data.category !== undefined) {
      updates.push(`category = ?`);
      values.push(data.category);
    }
    if (data.description !== undefined) {
      updates.push(`description = ?`);
      values.push(data.description);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = ?`);
      values.push(data.isActive);
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);

    await query(
      `UPDATE accessories SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    // Soft delete
    await query(
      `UPDATE accessories SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    return true;
  }

  private static mapRow(row: any): Accessory {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      isActive: row.isActive || row.is_active,
      createdAt: new Date(row.createdAt || row.created_at),
      updatedAt: new Date(row.updatedAt || row.updated_at),
    };
  }
}

export class LaptopAccessoryModel {
  static async addAccessory(
    laptopId: string,
    accessoryId: string,
    quantity: number = 1
  ): Promise<LaptopAccessory> {
    const id = uuidv4();
    await query(
      `INSERT INTO laptop_accessories (id, laptop_id, accessory_id, quantity)
       VALUES (?, ?, ?, ?)`,
      [id, laptopId, accessoryId, quantity]
    );

    const item = await this.findById(id);
    return item as LaptopAccessory;
  }

  static async findById(id: string): Promise<LaptopAccessory | null> {
    const result = await query(
      `SELECT id, laptop_id as laptopId, accessory_id as accessoryId, quantity,
              added_date as addedDate
       FROM laptop_accessories WHERE id = ?`,
      [id]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async findByLaptop(laptopId: string): Promise<LaptopAccessory[]> {
    const result = await query(
      `SELECT la.id, la.laptop_id as laptopId, la.accessory_id as accessoryId, 
              la.quantity, la.added_date as addedDate,
              a.name, a.category, a.description, a.is_active as isActive
       FROM laptop_accessories la
       JOIN accessories a ON la.accessory_id = a.id
       WHERE la.laptop_id = ? ORDER BY la.added_date DESC`,
      [laptopId]
    );
    return (result.rows as any[]).map(row => ({
      ...this.mapRow(row),
      accessory: {
        id: row.accessoryId,
        name: row.name,
        category: row.category,
        description: row.description,
        isActive: row.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }));
  }

  static async updateQuantity(
    laptopId: string,
    accessoryId: string,
    quantity: number
  ): Promise<LaptopAccessory | null> {
    await query(
      `UPDATE laptop_accessories SET quantity = ? WHERE laptop_id = ? AND accessory_id = ?`,
      [quantity, laptopId, accessoryId]
    );

    const result = await query(
      `SELECT id FROM laptop_accessories WHERE laptop_id = ? AND accessory_id = ?`,
      [laptopId, accessoryId]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.findById(rows[0].id) : null;
  }

  static async removeAccessory(laptopId: string, accessoryId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM laptop_accessories WHERE laptop_id = ? AND accessory_id = ?`,
      [laptopId, accessoryId]
    );
    return result.rowCount > 0;
  }

  private static mapRow(row: any): LaptopAccessory {
    return {
      id: row.id,
      laptopId: row.laptopId || row.laptop_id,
      accessoryId: row.accessoryId || row.accessory_id,
      quantity: row.quantity,
      addedDate: new Date(row.addedDate || row.added_date),
    };
  }
}
