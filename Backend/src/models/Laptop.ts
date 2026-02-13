import { query } from "../database/connection.js";
import { Laptop } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

export class LaptopModel {
  static async create(data: {
    assetTag: string;
    serialNumber: string;
    model: string;
    brand: string;
    purchaseDate: Date;
    warrantyExpiry: Date;
    status: string;
    department: string;
    specifications?: {
      cpu?: string;
      ram?: string;
      storage?: string;
    };
    purchasePrice?: number;
    notes?: string;
  }): Promise<Laptop> {
    const id = uuidv4();
    await query(
      `INSERT INTO laptops (id, asset_tag, serial_number, model, brand, purchase_date, warranty_expiry, status, department, specifications, purchase_price, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.assetTag,
        data.serialNumber,
        data.model,
        data.brand,
        data.purchaseDate,
        data.warrantyExpiry,
        data.status,
        data.department,
        data.specifications ? JSON.stringify(data.specifications) : null,
        data.purchasePrice ?? null,
        data.notes || null,
      ]
    );
    
    const fetched = await this.findById(id);
    return fetched as Laptop;
  }

  static async findAll(): Promise<Laptop[]> {
    const result = await query(
      `SELECT l.id, l.asset_tag as assetTag, l.serial_number as serialNumber, l.model, l.brand,
              l.purchase_date as purchaseDate, l.warranty_expiry as warrantyExpiry,
              CASE
                WHEN EXISTS (
                  SELECT 1
                  FROM assignments a
                  WHERE a.laptop_id = l.id
                    AND a.status IN ('ACTIVE', 'RETURN_REQUESTED', 'RETURN_REJECTED')
                ) THEN 'ASSIGNED'
                WHEN l.status = 'ASSIGNED' THEN 'AVAILABLE'
                ELSE l.status
              END as status,
              l.department, l.specifications, l.purchase_price as purchasePrice, l.notes,
              l.created_at as createdAt, l.updated_at as updatedAt
       FROM laptops l ORDER BY l.created_at DESC`
    );
    return (result.rows as any[]).map(row => this.mapRow(row));
  }

  static async findById(id: string): Promise<Laptop | null> {
    const result = await query(
      `SELECT l.id, l.asset_tag as assetTag, l.serial_number as serialNumber, l.model, l.brand,
              l.purchase_date as purchaseDate, l.warranty_expiry as warrantyExpiry,
              CASE
                WHEN EXISTS (
                  SELECT 1
                  FROM assignments a
                  WHERE a.laptop_id = l.id
                    AND a.status IN ('ACTIVE', 'RETURN_REQUESTED', 'RETURN_REJECTED')
                ) THEN 'ASSIGNED'
                WHEN l.status = 'ASSIGNED' THEN 'AVAILABLE'
                ELSE l.status
              END as status,
              l.department, l.specifications, l.purchase_price as purchasePrice, l.notes,
              l.created_at as createdAt, l.updated_at as updatedAt
       FROM laptops l WHERE l.id = ?`,
      [id]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async update(
    id: string,
    data: Partial<{
      assetTag: string;
      serialNumber: string;
      model: string;
      brand: string;
      purchaseDate: Date;
      warrantyExpiry: Date;
      status: string;
      department: string;
      specifications?: {
        cpu?: string;
        ram?: string;
        storage?: string;
      };
      purchasePrice?: number;
      notes?: string;
    }>
  ): Promise<Laptop | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.assetTag !== undefined) {
      updates.push(`asset_tag = ?`);
      values.push(data.assetTag);
    }
    if (data.serialNumber !== undefined) {
      updates.push(`serial_number = ?`);
      values.push(data.serialNumber);
    }
    if (data.model !== undefined) {
      updates.push(`model = ?`);
      values.push(data.model);
    }
    if (data.brand !== undefined) {
      updates.push(`brand = ?`);
      values.push(data.brand);
    }
    if (data.purchaseDate !== undefined) {
      updates.push(`purchase_date = ?`);
      values.push(data.purchaseDate);
    }
    if (data.warrantyExpiry !== undefined) {
      updates.push(`warranty_expiry = ?`);
      values.push(data.warrantyExpiry);
    }
    if (data.status !== undefined) {
      updates.push(`status = ?`);
      values.push(data.status);
    }
    if (data.department !== undefined) {
      updates.push(`department = ?`);
      values.push(data.department);
    }
    if (data.specifications !== undefined) {
      updates.push(`specifications = ?`);
      values.push(data.specifications ? JSON.stringify(data.specifications) : null);
    }
    if (data.purchasePrice !== undefined) {
      updates.push(`purchase_price = ?`);
      values.push(data.purchasePrice);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = ?`);
      values.push(data.notes);
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);

    await query(
      `UPDATE laptops SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query(`DELETE FROM laptops WHERE id = ?`, [id]);
    return result.rowCount > 0;
  }

  static async findByStatus(status: string): Promise<Laptop[]> {
    const result = await query(
      `SELECT l.id, l.asset_tag as assetTag, l.serial_number as serialNumber, l.model, l.brand,
              l.purchase_date as purchaseDate, l.warranty_expiry as warrantyExpiry,
              CASE
                WHEN EXISTS (
                  SELECT 1
                  FROM assignments a
                  WHERE a.laptop_id = l.id
                    AND a.status IN ('ACTIVE', 'RETURN_REQUESTED', 'RETURN_REJECTED')
                ) THEN 'ASSIGNED'
                WHEN l.status = 'ASSIGNED' THEN 'AVAILABLE'
                ELSE l.status
              END as status,
              l.department, l.specifications, l.purchase_price as purchasePrice, l.notes,
              l.created_at as createdAt, l.updated_at as updatedAt
       FROM laptops l
       WHERE (
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM assignments a
             WHERE a.laptop_id = l.id
               AND a.status IN ('ACTIVE', 'RETURN_REQUESTED', 'RETURN_REJECTED')
           ) THEN 'ASSIGNED'
           WHEN l.status = 'ASSIGNED' THEN 'AVAILABLE'
           ELSE l.status
         END
       ) = ?
       ORDER BY l.created_at DESC`,
      [status]
    );
    return (result.rows as any[]).map(row => this.mapRow(row));
  }

  private static mapRow(row: any): Laptop {
    return {
      id: row.id,
      assetTag: row.assetTag || row.asset_tag,
      serialNumber: row.serialNumber || row.serial_number,
      model: row.model,
      brand: row.brand,
      purchaseDate: new Date(row.purchaseDate || row.purchase_date),
      warrantyExpiry: new Date(row.warrantyExpiry || row.warranty_expiry),
      status: row.status,
      department: row.department,
      specifications: row.specifications
        ? typeof row.specifications === "string"
          ? JSON.parse(row.specifications)
          : row.specifications
        : undefined,
      purchasePrice: row.purchasePrice ?? row.purchase_price ?? undefined,
      notes: row.notes,
      createdAt: new Date(row.createdAt || row.created_at),
      updatedAt: new Date(row.updatedAt || row.updated_at),
    };
  }
}
