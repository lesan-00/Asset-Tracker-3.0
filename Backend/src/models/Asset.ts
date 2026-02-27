import { query } from "../database/connection.js";

export type AssetType =
  | "LAPTOP"
  | "PRINTER"
  | "SWITCH"
  | "ROUTER"
  | "DESKTOP"
  | "PDA"
  | "HCS_CRANE_SCALE"
  | "MOBILE_PHONE"
  | "SYSTEM_UNIT"
  | "MONITOR"
  | "KEYBOARD"
  | "MOUSE"
  | "HEADSET";
export type AssetStatus = "IN_STOCK" | "ASSIGNED" | "IN_REPAIR" | "RETIRED";

export interface AssetRecord {
  id: number;
  assetTag: string;
  assetType: AssetType;
  brand: string;
  model: string;
  imeiNo?: string | null;
  serialNumber?: string | null;
  specifications?: string | null;
  department?: string | null;
  status: AssetStatus;
  location: string;
  purchaseDate?: string | null;
  warrantyEndDate?: string | null;
  notes?: string | null;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetActivityRecord {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  createdAt: string;
}

export interface AssetSearchResult {
  id: number;
  label: string;
}

export interface PaginatedAssetResult {
  data: AssetRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class AssetModel {
  static async create(data: {
    assetTag: string;
    assetType: AssetType;
    brand: string;
    model: string;
    imeiNo?: string | null;
    serialNumber?: string | null;
    specifications?: string | null;
    department?: string | null;
    status: AssetStatus;
    location: string;
    purchaseDate?: string | null;
    warrantyEndDate?: string | null;
    notes?: string | null;
  }): Promise<AssetRecord | null> {
    await query(
      `INSERT INTO assets (
        asset_tag, asset_type, brand, model, imei_no, serial_number, specifications, department,
        status, location, purchase_date, warranty_end_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.assetTag,
        data.assetType,
        data.brand,
        data.model,
        data.imeiNo ?? null,
        data.serialNumber ?? null,
        normalizeSpecificationsForWrite(data.specifications ?? null),
        data.department ?? null,
        data.status,
        data.location,
        data.purchaseDate ?? null,
        data.warrantyEndDate ?? null,
        data.notes ?? null,
      ]
    );

    const created = await query(`SELECT id FROM assets WHERE asset_tag = ? LIMIT 1`, [data.assetTag]);
    const id = Number((created.rows as any[])[0]?.id || 0);
    if (!id) return null;
    return this.findById(id);
  }

  static async findAll(filters?: {
    type?: AssetType;
    status?: AssetStatus;
    location?: string;
    search?: string;
  }): Promise<AssetRecord[]> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (filters?.type) {
      where.push("a.asset_type = ?");
      values.push(filters.type);
    }
    if (filters?.status) {
      where.push("a.status = ?");
      values.push(filters.status);
    }
    if (filters?.location) {
      where.push("a.location = ?");
      values.push(filters.location);
    }
    if (filters?.search) {
      where.push(
        `(a.asset_tag LIKE ? OR COALESCE(a.imei_no, '') LIKE ? OR COALESCE(a.serial_number, '') LIKE ? OR a.brand LIKE ? OR a.model LIKE ?)`
      );
      const pattern = `%${filters.search}%`;
      values.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const result = await query(
      `SELECT
         a.id,
         a.asset_tag as assetTag,
         a.asset_type as assetType,
         a.brand,
         a.model,
         a.imei_no as imeiNo,
         a.serial_number as serialNumber,
         a.specifications,
         a.department,
         a.status,
         a.location,
         a.purchase_date as purchaseDate,
         a.warranty_end_date as warrantyEndDate,
         a.notes,
         CAST(NULL AS CHAR) as assignedTo,
         a.created_at as createdAt,
         a.updated_at as updatedAt
       FROM assets a
       ${whereSql}
       ORDER BY a.created_at DESC`,
      values
    );
    return (result.rows as any[]).map((row) => this.mapRow(row));
  }

  static async findAllPaginated(
    filters: {
      type?: AssetType;
      status?: AssetStatus;
      location?: string;
      search?: string;
    },
    page: number,
    pageSize: number
  ): Promise<PaginatedAssetResult> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (filters?.type) {
      where.push("a.asset_type = ?");
      values.push(filters.type);
    }
    if (filters?.status) {
      where.push("a.status = ?");
      values.push(filters.status);
    }
    if (filters?.location) {
      where.push("a.location = ?");
      values.push(filters.location);
    }
    if (filters?.search) {
      where.push(
        `(a.asset_tag LIKE ? OR COALESCE(a.imei_no, '') LIKE ? OR COALESCE(a.serial_number, '') LIKE ? OR a.brand LIKE ? OR a.model LIKE ?)`
      );
      const pattern = `%${filters.search}%`;
      values.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const safePageSize = Math.max(1, Math.min(100, Math.floor(pageSize)));
    const safePage = Math.max(1, Math.floor(page));
    const offset = (safePage - 1) * safePageSize;

    const totalResult = await query(
      `SELECT COUNT(*) AS total
       FROM assets a
       ${whereSql}`,
      values.length > 0 ? values : undefined
    );
    const total = Number((totalResult.rows as any[])[0]?.total || 0);

    const pagedResult = await query(
      `SELECT
         a.id,
         a.asset_tag as assetTag,
         a.asset_type as assetType,
         a.brand,
         a.model,
         a.imei_no as imeiNo,
         a.serial_number as serialNumber,
         a.specifications,
         a.department,
         a.status,
         a.location,
         a.purchase_date as purchaseDate,
         a.warranty_end_date as warrantyEndDate,
         a.notes,
         CAST(NULL AS CHAR) as assignedTo,
         a.created_at as createdAt,
         a.updated_at as updatedAt
       FROM assets a
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, safePageSize, offset]
    );

    const data = (pagedResult.rows as any[]).map((row) => this.mapRow(row));
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));

    return {
      data,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages,
    };
  }

  static async findById(id: number): Promise<AssetRecord | null> {
    const result = await query(
      `SELECT
         a.id,
         a.asset_tag as assetTag,
         a.asset_type as assetType,
         a.brand,
         a.model,
         a.imei_no as imeiNo,
         a.serial_number as serialNumber,
         a.specifications,
         a.department,
         a.status,
         a.location,
         a.purchase_date as purchaseDate,
         a.warranty_end_date as warrantyEndDate,
         a.notes,
         CAST(NULL AS CHAR) as assignedTo,
         a.created_at as createdAt,
         a.updated_at as updatedAt
       FROM assets a
       WHERE a.id = ?
       LIMIT 1`,
      [id]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async findByImei(imeiNo: string): Promise<AssetRecord | null> {
    const result = await query(
      `SELECT
         a.id,
         a.asset_tag as assetTag,
         a.asset_type as assetType,
         a.brand,
         a.model,
         a.imei_no as imeiNo,
         a.serial_number as serialNumber,
         a.specifications,
         a.department,
         a.status,
         a.location,
         a.purchase_date as purchaseDate,
         a.warranty_end_date as warrantyEndDate,
         a.notes,
         CAST(NULL AS CHAR) as assignedTo,
         a.created_at as createdAt,
         a.updated_at as updatedAt
       FROM assets a
       WHERE a.imei_no = ?
       LIMIT 1`,
      [imeiNo]
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  static async findAssignable(filters?: {
    type?: AssetType;
    search?: string;
  }): Promise<AssetRecord[]> {
    const where: string[] = ["a.status = 'IN_STOCK'"];
    const values: unknown[] = [];

    if (filters?.type) {
      where.push("a.asset_type = ?");
      values.push(filters.type);
    }

    if (filters?.search) {
      where.push(
        `(a.asset_tag LIKE ? OR COALESCE(a.imei_no, '') LIKE ? OR COALESCE(a.serial_number, '') LIKE ? OR a.brand LIKE ? OR a.model LIKE ?)`
      );
      const pattern = `%${filters.search}%`;
      values.push(pattern, pattern, pattern, pattern, pattern);
    }

    const result = await query(
      `SELECT
         a.id,
         a.asset_tag as assetTag,
         a.asset_type as assetType,
         a.brand,
         a.model,
         a.imei_no as imeiNo,
         a.serial_number as serialNumber,
         a.specifications,
         a.department,
         a.status,
         a.location,
         a.purchase_date as purchaseDate,
         a.warranty_end_date as warrantyEndDate,
         a.notes,
         CAST(NULL AS CHAR) as assignedTo,
         a.created_at as createdAt,
         a.updated_at as updatedAt
       FROM assets a
       WHERE ${where.join(" AND ")}
       ORDER BY a.asset_type ASC, a.asset_tag ASC`,
      values
    );

    return (result.rows as any[]).map((row) => this.mapRow(row));
  }

  static async searchForAssignment(queryText: string): Promise<AssetSearchResult[]> {
    const term = queryText.trim();
    const hasTerm = term.length > 0;
    const result = hasTerm
      ? await query(
          `SELECT
             id,
             asset_tag as assetTag,
             brand,
             model,
             imei_no as imeiNo,
             serial_number as serialNumber
           FROM assets
           WHERE status = 'IN_STOCK'
             AND (
               asset_tag LIKE ?
               OR model LIKE ?
               OR COALESCE(imei_no, '') LIKE ?
               OR COALESCE(serial_number, '') LIKE ?
             )
           ORDER BY asset_tag ASC
           LIMIT 20`,
          [`${term}%`, `${term}%`, `${term}%`, `${term}%`]
        )
      : await query(
          `SELECT
             id,
             asset_tag as assetTag,
             brand,
             model,
             imei_no as imeiNo,
             serial_number as serialNumber
           FROM assets
           WHERE status = 'IN_STOCK'
           ORDER BY asset_tag ASC
           LIMIT 20`
        );

    return (result.rows as any[]).map((row) => ({
      id: Number(row.id),
      label: `${row.assetTag || row.imeiNo || row.serialNumber || `#${row.id}`} - ${row.brand} ${row.model}`,
    }));
  }

  static async update(
    id: number,
    data: Partial<{
      assetTag: string;
      assetType: AssetType;
      brand: string;
      model: string;
      imeiNo?: string | null;
      serialNumber?: string | null;
      specifications?: string | null;
      department?: string | null;
      status: AssetStatus;
      location: string;
      purchaseDate?: string | null;
      warrantyEndDate?: string | null;
      notes?: string | null;
    }>
  ): Promise<AssetRecord | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    const setValue = (column: string, value: unknown) => {
      updates.push(`${column} = ?`);
      values.push(value);
    };

    if (data.assetTag !== undefined) setValue("asset_tag", data.assetTag);
    if (data.assetType !== undefined) setValue("asset_type", data.assetType);
    if (data.brand !== undefined) setValue("brand", data.brand);
    if (data.model !== undefined) setValue("model", data.model);
    if (data.imeiNo !== undefined) setValue("imei_no", data.imeiNo ?? null);
    if (data.serialNumber !== undefined) setValue("serial_number", data.serialNumber ?? null);
    if (data.specifications !== undefined) {
      setValue("specifications", normalizeSpecificationsForWrite(data.specifications ?? null));
    }
    if (data.department !== undefined) setValue("department", data.department ?? null);
    if (data.status !== undefined) setValue("status", data.status);
    if (data.location !== undefined) setValue("location", data.location);
    if (data.purchaseDate !== undefined) setValue("purchase_date", data.purchaseDate ?? null);
    if (data.warrantyEndDate !== undefined) setValue("warranty_end_date", data.warrantyEndDate ?? null);
    if (data.notes !== undefined) setValue("notes", data.notes ?? null);

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    await query(
      `UPDATE assets
       SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query(`DELETE FROM assets WHERE id = ?`, [id]);
    return result.rowCount > 0;
  }

  static async getSummary(type?: AssetType): Promise<{
    totalAssets: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    warrantyExpiringSoon: number;
  }> {
    const hasTypeFilter = Boolean(type);
    const whereSql = hasTypeFilter ? "WHERE asset_type = ?" : "";
    const params = hasTypeFilter ? [type as AssetType] : undefined;

    const totalResult = await query(`SELECT COUNT(*) as totalAssets FROM assets ${whereSql}`, params);
    const totalAssets = Number((totalResult.rows as any[])[0]?.totalAssets || 0);

    const statusResult = await query(
      `SELECT status, COUNT(*) as count
       FROM assets
       ${whereSql}
       GROUP BY status`
      ,
      params
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows as any[]) {
      byStatus[row.status] = Number(row.count || 0);
    }

    const typeResult = await query(
      `SELECT asset_type as assetType, COUNT(*) as count
       FROM assets
       ${whereSql}
       GROUP BY asset_type`
      ,
      params
    );
    const byType: Record<string, number> = {};
    for (const row of typeResult.rows as any[]) {
      byType[row.assetType] = Number(row.count || 0);
    }

    const warrantyResult = await query(
      `SELECT COUNT(*) as warrantyExpiringSoon
       FROM assets
       ${hasTypeFilter ? "WHERE asset_type = ? AND" : "WHERE"}
         warranty_end_date IS NOT NULL
         AND warranty_end_date >= CURDATE()
         AND warranty_end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)`,
      params
    );
    const warrantyExpiringSoon = Number((warrantyResult.rows as any[])[0]?.warrantyExpiringSoon || 0);

    return {
      totalAssets,
      byStatus,
      byType,
      warrantyExpiringSoon,
    };
  }

  static async logActivity(data: {
    action: string;
    entityType: string;
    entityId: string;
    message: string;
  }): Promise<void> {
    await query(
      `INSERT INTO asset_activity_logs (action, entity_type, entity_id, message)
       VALUES (?, ?, ?, ?)`,
      [data.action, data.entityType, data.entityId, data.message]
    );
  }

  static async getRecentActivity(limit: number): Promise<AssetActivityRecord[]> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 10;
    const result = await query(
      `SELECT
         id,
         action,
         entity_type as entityType,
         entity_id as entityId,
         message,
         created_at as createdAt
       FROM asset_activity_logs
       WHERE entity_type = 'ASSET'
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`
    );
    return (result.rows as any[]).map((row) => ({
      id: Number(row.id),
      action: String(row.action),
      entityType: String(row.entityType),
      entityId: String(row.entityId),
      message: String(row.message),
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  static async getLaptopsLegacy() {
    const result = await query(
      `SELECT
         id,
         asset_tag as assetTag,
         serial_number as serialNumber,
         model,
         brand,
         purchase_date as purchaseDate,
         warranty_end_date as warrantyExpiry,
         status,
         department,
         specifications,
         CAST(NULL AS DECIMAL(10,2)) as purchasePrice,
         notes,
         created_at as createdAt,
         updated_at as updatedAt
       FROM assets
       WHERE asset_type = 'LAPTOP'
       ORDER BY created_at DESC`
    );

    return (result.rows as any[]).map((row) => ({
      id: String(row.id),
      assetTag: row.assetTag,
      serialNumber: row.serialNumber,
      model: row.model,
      brand: row.brand,
      purchaseDate: row.purchaseDate,
      warrantyExpiry: row.warrantyExpiry,
      status:
        row.status === "IN_STOCK"
          ? "AVAILABLE"
          : row.status === "IN_REPAIR"
            ? "MAINTENANCE"
            : row.status,
      department: row.department || "",
      specifications:
        row.specifications && typeof row.specifications === "string"
          ? safeParseSpecifications(row.specifications)
          : row.specifications || undefined,
      purchasePrice: row.purchasePrice || undefined,
      notes: row.notes || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  private static mapRow(row: any): AssetRecord {
    return {
      id: Number(row.id),
      assetTag: row.assetTag || row.asset_tag,
      assetType: row.assetType || row.asset_type,
      brand: row.brand,
      model: row.model,
      imeiNo: row.imeiNo || row.imei_no || null,
      serialNumber: row.serialNumber || row.serial_number || null,
      specifications: normalizeSpecificationsForRead(row.specifications),
      department: row.department || null,
      status: row.status,
      location: row.location,
      purchaseDate: row.purchaseDate || row.purchase_date || null,
      warrantyEndDate: row.warrantyEndDate || row.warranty_end_date || null,
      notes: row.notes || null,
      assignedTo: row.assignedTo || null,
      createdAt: new Date(row.createdAt || row.created_at).toISOString(),
      updatedAt: new Date(row.updatedAt || row.updated_at).toISOString(),
    };
  }
}

function safeParseSpecifications(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeSpecificationsForWrite(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value);
  if (normalized.trim() === "") return null;

  // Keep valid JSON as-is; otherwise wrap plain text to valid JSON string
  // for databases where `specifications` is typed as JSON.
  try {
    JSON.parse(normalized);
    return normalized;
  } catch {
    return JSON.stringify(normalized);
  }
}

function normalizeSpecificationsForRead(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed;
    return JSON.stringify(parsed);
  } catch {
    return value;
  }
}
