import { AssetModel, AssetStatus, AssetType } from "../models/Asset.js";
import { getConnection } from "../database/connection.js";
import { query } from "../database/connection.js";
import ExcelJS from "exceljs";

type ImportRow = {
  rowNumber: number;
  assetTag: string;
  assetType: string;
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
};

type ImportValidationError = {
  row: number;
  message: string;
};

export type AssetImportPreviewRow = {
  rowNumber: number;
  data: Record<string, string | null>;
  errors: string[];
  warnings: string[];
};

export type AssetImportParseResult = {
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  columns: string[];
  rows: AssetImportPreviewRow[];
  validRows: ImportRow[];
  errors: ImportValidationError[];
};

export type AssetPermanentDeleteResult = {
  assetId: number;
  assetTag: string;
  deleted: {
    assignments: number;
    issues: number;
    activityLogs: number;
    notifications: number;
    asset: number;
  };
};

const allowedImportTypes: AssetType[] = [
  "LAPTOP",
  "DESKTOP",
  "PDA",
  "HCS_CRANE_SCALE",
  "PRINTER",
  "SWITCH",
  "ROUTER",
  "MOBILE_PHONE",
  "MONITOR",
  "KEYBOARD",
  "MOUSE",
  "SYSTEM_UNIT",
  "HEADSET",
];

const allowedStatuses: AssetStatus[] = ["IN_STOCK", "ASSIGNED", "IN_REPAIR", "RETIRED"];

export class AssetService {
  static async listAssets(filters?: {
    type?: AssetType;
    status?: AssetStatus;
    location?: string;
    search?: string;
  }) {
    return AssetModel.findAll(filters);
  }

  static async listAssetsPaginated(
    filters: {
      type?: AssetType;
      status?: AssetStatus;
      location?: string;
      search?: string;
    },
    page: number,
    pageSize: number
  ) {
    return AssetModel.findAllPaginated(filters, page, pageSize);
  }

  static async getAssetById(id: number) {
    return AssetModel.findById(id);
  }

  static async listAssignableAssets(filters?: {
    type?: AssetType;
    search?: string;
  }) {
    return AssetModel.findAssignable(filters);
  }

  static async searchAssets(queryText: string) {
    return AssetModel.searchForAssignment(queryText);
  }

  static async createAsset(data: {
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
  }) {
    const normalized = await this.normalizeAndValidateAssetPayload(data);
    const created = await AssetModel.create(normalized);
    if (created) {
      await AssetModel.logActivity({
        action: "CREATE",
        entityType: "ASSET",
        entityId: String(created.id),
        message: `Created ${created.assetType} asset ${created.assetTag}`,
      });
    }
    return created;
  }

  static async updateAsset(
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
  ) {
    const existing = await AssetModel.findById(id);
    if (!existing) return null;

    const merged = {
      assetTag: data.assetTag ?? existing.assetTag,
      assetType: data.assetType ?? existing.assetType,
      brand: data.brand ?? existing.brand,
      model: data.model ?? existing.model,
      imeiNo: data.imeiNo ?? existing.imeiNo ?? null,
      serialNumber: data.serialNumber ?? existing.serialNumber ?? null,
      specifications: data.specifications ?? existing.specifications ?? null,
      department: data.department ?? existing.department ?? null,
      status: data.status ?? existing.status,
      location: data.location ?? existing.location,
      purchaseDate: data.purchaseDate ?? existing.purchaseDate ?? null,
      warrantyEndDate: data.warrantyEndDate ?? existing.warrantyEndDate ?? null,
      notes: data.notes ?? existing.notes ?? null,
    };

    const normalized = await this.normalizeAndValidateAssetPayload(merged, id);
    const updated = await AssetModel.update(id, normalized);
    if (updated) {
      await AssetModel.logActivity({
        action: "UPDATE",
        entityType: "ASSET",
        entityId: String(updated.id),
        message: `Updated ${updated.assetType} asset ${updated.assetTag}`,
      });
    }
    return updated;
  }

  static async deleteAsset(id: number) {
    const existing = await AssetModel.findById(id);
    const deleted = await AssetModel.delete(id);
    if (deleted && existing) {
      await AssetModel.logActivity({
        action: "DELETE",
        entityType: "ASSET",
        entityId: String(existing.id),
        message: `Deleted ${existing.assetType} asset ${existing.assetTag}`,
      });
    }
    return deleted;
  }

  static async deleteAssetPermanently(id: number): Promise<AssetPermanentDeleteResult | null> {
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      const [assetRows] = await connection.execute(
        `SELECT id, asset_tag as assetTag
         FROM assets
         WHERE id = ?
         FOR UPDATE`,
        [id]
      );
      const asset = Array.isArray(assetRows) ? (assetRows as any[])[0] : null;
      if (!asset) {
        await connection.rollback();
        return null;
      }

      const assetId = Number(asset.id);
      const assetTag = String(asset.assetTag || "");

      const [assignmentRows] = await connection.execute(
        `SELECT id
         FROM assignments
         WHERE asset_id = ?
         FOR UPDATE`,
        [assetId]
      );
      const assignmentIds = Array.isArray(assignmentRows)
        ? (assignmentRows as any[]).map((row) => String(row.id))
        : [];

      const [issueRows] = await connection.execute(
        `SELECT id
         FROM issues
         WHERE asset_id = ?
         FOR UPDATE`,
        [assetId]
      );
      const issueIds = Array.isArray(issueRows)
        ? (issueRows as any[]).map((row) => String(row.id))
        : [];

      let notificationsDeleted = 0;

      if (assignmentIds.length > 0) {
        const placeholders = assignmentIds.map(() => "?").join(", ");
        const [notifAssignmentsResult] = await connection.execute(
          `DELETE FROM notifications
           WHERE entity_type = 'ASSIGNMENT'
             AND entity_id IN (${placeholders})`,
          assignmentIds
        );
        notificationsDeleted += Number((notifAssignmentsResult as any)?.affectedRows || 0);
      }

      if (issueIds.length > 0) {
        const placeholders = issueIds.map(() => "?").join(", ");
        const [notifIssuesResult] = await connection.execute(
          `DELETE FROM notifications
           WHERE entity_type = 'ISSUE'
             AND entity_id IN (${placeholders})`,
          issueIds
        );
        notificationsDeleted += Number((notifIssuesResult as any)?.affectedRows || 0);
      }

      const [notifAssetResult] = await connection.execute(
        `DELETE FROM notifications
         WHERE entity_type = 'ASSET'
           AND entity_id = ?`,
        [String(assetId)]
      );
      notificationsDeleted += Number((notifAssetResult as any)?.affectedRows || 0);

      const [assignmentDeleteResult] = await connection.execute(
        `DELETE FROM assignments WHERE asset_id = ?`,
        [assetId]
      );
      const assignmentsDeleted = Number((assignmentDeleteResult as any)?.affectedRows || 0);

      const [issuesDeleteResult] = await connection.execute(
        `DELETE FROM issues WHERE asset_id = ?`,
        [assetId]
      );
      const issuesDeleted = Number((issuesDeleteResult as any)?.affectedRows || 0);

      const [activityDeleteResult] = await connection.execute(
        `DELETE FROM asset_activity_logs
         WHERE entity_type = 'ASSET'
           AND entity_id = ?`,
        [String(assetId)]
      );
      const activityLogsDeleted = Number((activityDeleteResult as any)?.affectedRows || 0);

      const [assetDeleteResult] = await connection.execute(
        `DELETE FROM assets WHERE id = ?`,
        [assetId]
      );
      const assetsDeleted = Number((assetDeleteResult as any)?.affectedRows || 0);

      await connection.commit();

      return {
        assetId,
        assetTag,
        deleted: {
          assignments: assignmentsDeleted,
          issues: issuesDeleted,
          activityLogs: activityLogsDeleted,
          notifications: notificationsDeleted,
          asset: assetsDeleted,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getInventorySummary(filters?: { type?: AssetType }) {
    const summary = await AssetModel.getSummary(filters?.type);
    const recentActivity = await AssetModel.getRecentActivity(10);
    return {
      ...summary,
      recentActivity,
    };
  }

  static async parseImportFile(fileName: string, base64Content: string): Promise<AssetImportParseResult> {
    const extension = fileName.toLowerCase().split(".").pop() || "";
    const buffer = Buffer.from(base64Content, "base64");
    if (!buffer.length) {
      throw new Error("Uploaded file is empty");
    }

    let rows: Record<string, string>[] = [];
    let columns: string[] = [];
    if (extension === "csv") {
      const parsed = this.parseCsv(buffer.toString("utf8"));
      rows = parsed.rows;
      columns = parsed.columns;
    } else if (extension === "xlsx" || extension === "xls") {
      const parsed = await this.parseXlsx(buffer);
      rows = parsed.rows;
      columns = parsed.columns;
    } else {
      throw new Error("Unsupported file type. Please upload CSV or Excel (.xlsx/.xls).");
    }

    return await this.validateImportRows(rows, columns);
  }

  static async importAssetsFromRows(validRows: ImportRow[]) {
    const insertedIds: number[] = [];
    const errors: ImportValidationError[] = [];
    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      for (const row of validRows) {
        try {
          const insertSql = `
            INSERT INTO assets (
              asset_tag, asset_type, brand, model, imei_no, serial_number, specifications, department,
              status, location, purchase_date, warranty_end_date, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const insertParams = [
            row.assetTag,
            row.assetType,
            row.brand,
            row.model,
            row.imeiNo ?? null,
            row.serialNumber ?? null,
            row.specifications ?? null,
            row.department ?? null,
            row.status,
            row.location,
            row.purchaseDate ?? null,
            row.warrantyEndDate ?? null,
            row.notes ?? null,
          ];
          const [insertResult] = await connection.execute(insertSql, insertParams);
          const id = Number((insertResult as any)?.insertId || 0);
          if (!id) {
            errors.push({
              row: row.rowNumber,
              message: "Insert failed for this row",
            });
            continue;
          }
          insertedIds.push(id);
          await connection.execute(
            `INSERT INTO asset_activity_logs (action, entity_type, entity_id, message)
             VALUES ('IMPORT', 'ASSET', ?, ?)`,
            [String(id), `Imported ${row.assetType} asset ${row.assetTag}`]
          );
        } catch (error) {
          const errorCode = String((error as any)?.code || "");
          let message = error instanceof Error ? error.message : "Insert failed";
          if (errorCode === "ER_DUP_ENTRY") {
            if (message.includes("asset_tag")) message = `asset_tag already exists: ${row.assetTag}`;
            else if (message.includes("serial_number")) message = `serial_number already exists: ${row.serialNumber}`;
            else if (message.includes("imei_no")) message = `imei_no already exists: ${row.imeiNo}`;
          }
          errors.push({
            row: row.rowNumber,
            message,
          });
        }
      }

      if (errors.length > 0) {
        await connection.rollback();
        return {
          insertedCount: 0,
          insertedIds: [],
          errors,
        };
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      insertedCount: insertedIds.length,
      insertedIds,
      errors,
    };
  }

  static getImportTemplateCsv() {
    return [
      "asset_tag,asset_type,brand,model,imei_no,serial_number,status,location,department,specifications,purchase_date,warranty_end_date,notes",
      "AST-001,LAPTOP,Dell,Latitude 5420,,SN12345,IN_STOCK,Head Office,IT,\"Intel i7;16GB;512GB SSD\",2024-01-10,2027-01-10,Initial stock",
      "AST-002,PRINTER,HP,LaserJet M404,,SN98765,IN_STOCK,Finance Office,Finance,,2024-03-05,2026-03-05,",
      "AST-003,MOBILE_PHONE,Samsung,Galaxy S23,353490001234567,SN-IMEI-01,IN_STOCK,Head Office,IT,,2025-01-10,2027-01-10,Company phone",
      "AST-004,HEADSET,Jabra,Evolve2 65,,HS77881,IN_STOCK,Head Office,IT,,2025-02-10,2027-02-10,Wireless headset",
    ].join("\n");
  }

  private static parseCsv(content: string): { columns: string[]; rows: Record<string, string>[] } {
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return { columns: [], rows: [] };

    const headers = this.parseCsvLine(lines[0]).map((h) => this.normalizeHeader(h));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = (values[index] || "").trim();
      });
      rows.push(record);
    }

    return { columns: headers, rows };
  }

  private static parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  private static async parseXlsx(
    buffer: Buffer
  ): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
    const workbook = new ExcelJS.Workbook();
    await (workbook.xlsx as any).load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) return { columns: [], rows: [] };

    const headerRow = sheet.getRow(1);
    const headerValues = Array.isArray(headerRow.values) ? (headerRow.values as unknown[]) : [];
    const headers = headerValues.slice(1).map((cell: unknown) => this.normalizeHeader(String(cell || "")));

    const rows: Record<string, string>[] = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const record: Record<string, string> = {};
      let hasValue = false;
      headers.forEach((header: string, idx: number) => {
        const cell = row.getCell(idx + 1).value;
        const value = this.excelValueToString(cell).trim();
        if (value) hasValue = true;
        record[header] = value;
      });
      if (hasValue) rows.push(record);
    }

    return { columns: headers, rows };
  }

  private static excelValueToString(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "object" && value && "text" in (value as Record<string, unknown>)) {
      return String((value as { text?: string }).text || "");
    }
    return String(value);
  }

  private static normalizeHeader(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "_");
  }

  private static normalizeDate(value?: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  private static async validateImportRows(rawRows: Record<string, string>[], parsedColumns: string[]) {
    const previewRows: AssetImportPreviewRow[] = [];
    const errors: ImportValidationError[] = [];
    const seenImei = new Set<string>();
    const seenAssetTag = new Set<string>();
    const seenSerial = new Set<string>();
    const candidatesByRow = new Map<number, ImportRow>();
    const candidateAssetTags = new Set<string>();
    const candidateSerials = new Set<string>();
    const candidateImeis = new Set<string>();

    rawRows.forEach((row, index) => {
      const rowNumber = index + 2;
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];
      const assetType = String(row.asset_type || "").trim().toUpperCase();
      const statusValue = String(row.status || "").trim().toUpperCase();

      if (!assetType) {
        rowErrors.push("Missing required column value: asset_type");
      }
      if (assetType && !allowedImportTypes.includes(assetType as AssetType)) {
        rowErrors.push(`Invalid asset_type "${assetType}". Allowed: ${allowedImportTypes.join(", ")}`);
      }

      const assetTag = String(row.asset_tag || "").trim();
      const brand = String(row.brand || row.make || "").trim();
      const model = String(row.model || "").trim();
      const imeiNo = this.normalizeImei(row.imei_no);
      const serialNumber = (row.serial_number || "").trim() || null;
      const location = String(row.location || "").trim().replace(/\s+/g, " ");
      if (!assetTag || !brand || !model || !statusValue || !location) {
        rowErrors.push("asset_tag, asset_type, brand/make, model, status, and location are required");
      }
      if (assetType === "MOBILE_PHONE" && !imeiNo) {
        rowErrors.push("imei_no is required for MOBILE_PHONE");
      }
      if (assetType === "MOBILE_PHONE" && imeiNo && !this.isValidImei(imeiNo)) {
        rowErrors.push("imei_no must contain 14 to 16 digits for MOBILE_PHONE");
      }

      const normalizedTag = assetTag.toUpperCase();
      if (normalizedTag) {
        if (seenAssetTag.has(normalizedTag)) {
          rowErrors.push(`Duplicate asset_tag "${assetTag}" in import file`);
        } else {
          seenAssetTag.add(normalizedTag);
          candidateAssetTags.add(normalizedTag);
        }
      }

      if (serialNumber) {
        const normalizedSerial = serialNumber.toUpperCase();
        if (seenSerial.has(normalizedSerial)) {
          rowErrors.push(`Duplicate serial_number "${serialNumber}" in import file`);
        } else {
          seenSerial.add(normalizedSerial);
          candidateSerials.add(normalizedSerial);
        }
      }
      if (imeiNo) {
        if (seenImei.has(imeiNo)) {
          rowErrors.push(`Duplicate imei_no "${imeiNo}" in import file`);
        } else {
          seenImei.add(imeiNo);
          candidateImeis.add(imeiNo);
        }
      }

      if (statusValue && !allowedStatuses.includes(statusValue as AssetStatus)) {
        rowErrors.push(`Invalid status "${statusValue}". Allowed: ${allowedStatuses.join(", ")}`);
      }

      const normalizedData = {
        assetTag,
        assetType,
        brand,
        model,
        imeiNo,
        serialNumber,
        specifications: (row.specifications || "").trim() || null,
        department: (row.department || "").trim() || null,
        status: (statusValue || "IN_STOCK") as AssetStatus,
        location,
        purchaseDate: this.normalizeDate(row.purchase_date),
        warrantyEndDate: this.normalizeDate(row.warranty_end_date),
        notes: (row.notes || "").trim() || null,
      };

      candidatesByRow.set(rowNumber, {
        rowNumber,
        ...normalizedData,
      });

      previewRows.push({
        rowNumber,
        data: {
          asset_tag: normalizedData.assetTag,
          asset_type: normalizedData.assetType,
          brand: normalizedData.brand,
          model: normalizedData.model,
          imei_no: normalizedData.imeiNo,
          serial_number: normalizedData.serialNumber,
          status: normalizedData.status,
          location: normalizedData.location,
          department: normalizedData.department,
          purchase_date: normalizedData.purchaseDate,
          warranty_end_date: normalizedData.warrantyEndDate,
          notes: normalizedData.notes,
        },
        errors: rowErrors,
        warnings: rowWarnings,
      });
    });

    const dbDuplicates = await this.findExistingImportDuplicates({
      assetTags: Array.from(candidateAssetTags),
      serialNumbers: Array.from(candidateSerials),
      imeiNumbers: Array.from(candidateImeis),
    });

    for (const previewRow of previewRows) {
      const assetTag = String(previewRow.data.asset_tag || "").trim().toUpperCase();
      const serialNumber = String(previewRow.data.serial_number || "").trim().toUpperCase();
      const imeiNo = String(previewRow.data.imei_no || "").trim();

      if (assetTag && dbDuplicates.assetTags.has(assetTag)) {
        previewRow.errors.push(`asset_tag already exists in database: ${previewRow.data.asset_tag}`);
      }
      if (serialNumber && dbDuplicates.serialNumbers.has(serialNumber)) {
        previewRow.errors.push(`serial_number already exists in database: ${previewRow.data.serial_number}`);
      }
      if (imeiNo && dbDuplicates.imeiNumbers.has(imeiNo)) {
        previewRow.errors.push(`imei_no already exists in database: ${previewRow.data.imei_no}`);
      }

      for (const message of previewRow.errors) {
        if (!errors.some((item) => item.row === previewRow.rowNumber && item.message === message)) {
          errors.push({ row: previewRow.rowNumber, message });
        }
      }
    }

    const validRows: ImportRow[] = [];
    for (const previewRow of previewRows) {
      if (previewRow.errors.length === 0) {
        const valid = candidatesByRow.get(previewRow.rowNumber);
        if (valid) validRows.push(valid);
      }
    }

    const columns =
      parsedColumns.length > 0
        ? parsedColumns
        : [
            "asset_tag",
            "asset_type",
            "brand",
            "model",
            "imei_no",
            "serial_number",
            "status",
            "location",
            "department",
            "specifications",
            "purchase_date",
            "warranty_end_date",
            "notes",
          ];

    return {
      summary: {
        totalRows: rawRows.length,
        validRows: validRows.length,
        invalidRows: previewRows.filter((item) => item.errors.length > 0).length,
      },
      columns,
      rows: previewRows,
      validRows,
      errors,
    };
  }

  private static async findExistingImportDuplicates(input: {
    assetTags: string[];
    serialNumbers: string[];
    imeiNumbers: string[];
  }) {
    const duplicates = {
      assetTags: new Set<string>(),
      serialNumbers: new Set<string>(),
      imeiNumbers: new Set<string>(),
    };

    if (input.assetTags.length > 0) {
      const sql = `
        SELECT UPPER(asset_tag) AS value
        FROM assets
        WHERE UPPER(asset_tag) IN (${input.assetTags.map(() => "?").join(", ")})
      `;
      const params = input.assetTags.map((value) => value.toUpperCase());
      const result = await query(sql, params);
      for (const row of result.rows as Array<{ value?: string }>) {
        if (row.value) duplicates.assetTags.add(String(row.value).toUpperCase());
      }
    }

    if (input.serialNumbers.length > 0) {
      const sql = `
        SELECT UPPER(serial_number) AS value
        FROM assets
        WHERE serial_number IS NOT NULL
          AND TRIM(serial_number) <> ''
          AND UPPER(serial_number) IN (${input.serialNumbers.map(() => "?").join(", ")})
      `;
      const params = input.serialNumbers.map((value) => value.toUpperCase());
      const result = await query(sql, params);
      for (const row of result.rows as Array<{ value?: string }>) {
        if (row.value) duplicates.serialNumbers.add(String(row.value).toUpperCase());
      }
    }

    if (input.imeiNumbers.length > 0) {
      const sql = `
        SELECT imei_no AS value
        FROM assets
        WHERE imei_no IS NOT NULL
          AND TRIM(imei_no) <> ''
          AND imei_no IN (${input.imeiNumbers.map(() => "?").join(", ")})
      `;
      const params = input.imeiNumbers.map((value) => value.trim());
      const result = await query(sql, params);
      for (const row of result.rows as Array<{ value?: string }>) {
        if (row.value) duplicates.imeiNumbers.add(String(row.value).trim());
      }
    }

    return duplicates;
  }

  private static normalizeImei(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().replace(/[-\s]/g, "");
    return normalized || null;
  }

  private static isValidImei(value: string): boolean {
    return /^\d{14,16}$/.test(value);
  }

  private static async normalizeAndValidateAssetPayload(
    input: {
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
    },
    currentAssetId?: number
  ) {
    const normalized = {
      ...input,
      assetTag: String(input.assetTag || "").trim(),
      brand: String(input.brand || "").trim(),
      model: String(input.model || "").trim(),
      location: String(input.location || "").trim(),
      imeiNo: this.normalizeImei(input.imeiNo),
    };

    if (!normalized.assetTag || !normalized.brand || !normalized.model || !normalized.location) {
      throw new Error("assetTag, brand, model, and location are required");
    }

    if (normalized.assetType === "MOBILE_PHONE") {
      if (!normalized.imeiNo) {
        throw new Error("imeiNo is required for MOBILE_PHONE");
      }
      if (!this.isValidImei(normalized.imeiNo)) {
        throw new Error("imeiNo must contain 14 to 16 digits");
      }
    }

    if (normalized.imeiNo) {
      const duplicate = await AssetModel.findByImei(normalized.imeiNo);
      if (duplicate && duplicate.id !== currentAssetId) {
        const conflictError = new Error(`IMEI ${normalized.imeiNo} already exists`);
        (conflictError as any).statusCode = 409;
        throw conflictError;
      }
    }

    return normalized;
  }
}
