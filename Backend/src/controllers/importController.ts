import { Request, Response } from "express";
import { z } from "zod";
import ExcelJS from "exceljs";
import { StaffModel } from "../models/Staff.js";
import { query } from "../database/connection.js";

const StaffImportSchema = z.object({
  fileName: z.string().min(1),
  fileContentBase64: z.string().min(1),
});

type StaffImportRow = {
  rowNumber: number;
  employee_name: string;
  epf_no?: string;
  email: string;
  department: string;
  phone?: string;
  status?: string;
};

type RowError = {
  row: number;
  message: string;
};

export class ImportController {
  static async downloadStaffTemplate(req: Request, res: Response) {
    const csv = [
      "employee_name,epf_no,email,department,phone,status",
      "Jane Doe,EPF-0001,jane.doe@example.com,IT,08000000001,ACTIVE",
      "John Smith,,john.smith@example.com,Finance,08000000002,ACTIVE",
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="staff-import-template.csv"');
    return res.status(200).send(csv);
  }

  static async previewStaffImport(req: Request, res: Response) {
    try {
      const payload = StaffImportSchema.parse(req.body);
      const parsed = await parseStaffImportFile(payload.fileName, payload.fileContentBase64);
      return res.json({
        success: true,
        data: {
          summary: {
            totalRows: parsed.totalRows,
            validRows: parsed.validRows.length,
            invalidRows: parsed.errors.length,
          },
          columns: ["employee_name", "epf_no", "email", "department", "phone", "status"],
          rows: parsed.rows,
          errors: parsed.errors,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors[0]?.message || "Invalid payload" });
      }
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to preview staff import",
      });
    }
  }

  static async confirmStaffImport(req: Request, res: Response) {
    try {
      const payload = StaffImportSchema.parse(req.body);
      const parsed = await parseStaffImportFile(payload.fileName, payload.fileContentBase64);
      if (parsed.errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Validation failed. Fix row errors before import.",
          data: {
            summary: {
              totalRows: parsed.totalRows,
              validRows: parsed.validRows.length,
              invalidRows: parsed.errors.length,
            },
            columns: ["employee_name", "epf_no", "email", "department", "phone", "status"],
            rows: parsed.rows,
            errors: parsed.errors,
          },
        });
      }

      const insertErrors: RowError[] = [];
      let inserted = 0;
      for (let i = 0; i < parsed.validRows.length; i++) {
        const row = parsed.validRows[i];
        try {
          if (row.epf_no) {
            const existingEpf = await StaffModel.findByEpfNo(row.epf_no);
            if (existingEpf) {
              insertErrors.push({
                row: row.rowNumber,
                message: `EPF No already exists: ${row.epf_no}`,
              });
              continue;
            }
          }
          const existing = await StaffModel.findByEmail(row.email);
          if (existing) {
            insertErrors.push({
              row: row.rowNumber,
              message: `Email already exists: ${row.email}`,
            });
            continue;
          }
          await StaffModel.create({
            employeeName: row.employee_name,
            epfNo: row.epf_no ?? null,
            email: row.email,
            department: row.department,
            phoneNumber: row.phone || undefined,
            status: row.status === "DISABLED" ? "DISABLED" : "ACTIVE",
          });
          inserted += 1;
        } catch (error) {
          insertErrors.push({
            row: row.rowNumber,
            message: error instanceof Error ? error.message : "Failed to insert row",
          });
        }
      }

      return res.status(insertErrors.length > 0 ? 207 : 201).json({
        success: insertErrors.length === 0,
        data: {
          summary: {
            totalRows: parsed.totalRows,
            validRows: parsed.validRows.length,
            invalidRows: insertErrors.length,
            insertedRows: inserted,
          },
          columns: ["employee_name", "epf_no", "email", "department", "phone", "status"],
          rows: parsed.rows,
          errors: insertErrors,
        },
        message:
          insertErrors.length > 0
            ? "Import completed with some row errors."
            : "Staff imported successfully.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors[0]?.message || "Invalid payload" });
      }
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to confirm staff import",
      });
    }
  }
}

async function parseStaffImportFile(fileName: string, fileContentBase64: string) {
  const extension = fileName.toLowerCase().split(".").pop() || "";
  const buffer = Buffer.from(fileContentBase64, "base64");
  if (!buffer.length) throw new Error("Uploaded file is empty");

  const rows =
    extension === "csv"
      ? parseCsv(buffer.toString("utf8"))
      : extension === "xlsx" || extension === "xls"
        ? await parseXlsx(buffer)
        : null;

  if (!rows) {
    throw new Error("Unsupported file type. Please upload CSV or Excel (.xlsx/.xls).");
  }
  return await validateRows(rows);
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (values[index] || "").trim();
    });
    rows.push(record);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
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

async function parseXlsx(buffer: Buffer): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  await (workbook.xlsx as any).load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return [];

  const headerRow = sheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? (headerRow.values as unknown[]) : [];
  const headers = headerValues.slice(1).map((cell: unknown) => normalizeHeader(String(cell || "")));

  const rows: Record<string, string>[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const record: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header: string, idx: number) => {
      const value = String(row.getCell(idx + 1).value || "").trim();
      if (value) hasValue = true;
      record[header] = value;
    });
    if (hasValue) rows.push(record);
  }
  return rows;
}

async function validateRows(rawRows: Record<string, string>[]) {
  const validRows: StaffImportRow[] = [];
  const errors: RowError[] = [];
  const allowedStatus = new Set(["ACTIVE", "INACTIVE"]);
  const seenEpfNo = new Set<string>();
  const seenEmail = new Set<string>();
  const previewRows: Array<Record<string, unknown>> = [];

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const employeeName = String(row.employee_name || row.full_name || "").trim();
    const epfNo = String(row.epf_no || row.staff_id || "").trim().toUpperCase();
    const email = String(row.email || "").trim().toLowerCase();
    const department = String(row.department || "").trim();
    const phone = String(row.phone || "").trim();
    const status = String(row.status || "ACTIVE").trim().toUpperCase();

    if (!employeeName) {
      errors.push({ row: rowNumber, message: "Missing required field: employee_name" });
      return;
    }
    if (!email) {
      errors.push({ row: rowNumber, message: "Missing required field: email" });
      return;
    }
    if (!department) {
      errors.push({ row: rowNumber, message: "Missing required field: department" });
      return;
    }
    if (epfNo && seenEpfNo.has(epfNo)) {
      errors.push({ row: rowNumber, message: `Duplicate epf_no "${epfNo}" in import file` });
      return;
    }
    if (epfNo) seenEpfNo.add(epfNo);

    if (seenEmail.has(email)) {
      errors.push({ row: rowNumber, message: `Duplicate email "${email}" in import file` });
      return;
    }
    seenEmail.add(email);

    if (!allowedStatus.has(status)) {
      errors.push({ row: rowNumber, message: `Invalid status "${status}". Allowed: ACTIVE, INACTIVE` });
      return;
    }

    const normalizedRow = {
      rowNumber,
      employee_name: employeeName,
      epf_no: epfNo || undefined,
      email,
      department,
      phone: phone || undefined,
      status,
    };
    validRows.push(normalizedRow);
    previewRows.push(normalizedRow);
  });

  if (validRows.length > 0) {
    const validRowsWithEpf = validRows.filter((row) => row.epf_no && row.epf_no.trim().length > 0);
    const existingEpf = new Set<string>();
    if (validRowsWithEpf.length > 0) {
      const epfPlaceholders = validRowsWithEpf.map(() => "?").join(", ");
      const existingEpfResult = await query(
        `SELECT UPPER(epf_no) AS epf_no
         FROM staff
         WHERE epf_no IS NOT NULL
           AND TRIM(epf_no) <> ''
           AND UPPER(epf_no) IN (${epfPlaceholders})`,
        validRowsWithEpf.map((row) => String(row.epf_no).toUpperCase())
      );
      for (const row of Array.isArray(existingEpfResult.rows) ? (existingEpfResult.rows as any[]) : []) {
        existingEpf.add(String(row.epf_no).toUpperCase());
      }
    }

    const emailPlaceholders = validRows.map(() => "?").join(", ");
    const existingEmailResult = await query(
      `SELECT LOWER(email) AS email
       FROM staff
       WHERE LOWER(email) IN (${emailPlaceholders})`,
      validRows.map((row) => row.email.toLowerCase())
    );
    const existingEmails = new Set(
      Array.isArray(existingEmailResult.rows)
        ? (existingEmailResult.rows as any[]).map((row) => String(row.email).toLowerCase())
        : []
    );

    if (existingEpf.size > 0 || existingEmails.size > 0) {
      const dedupedValidRows: StaffImportRow[] = [];
      for (const row of validRows) {
        const rowNumber = row.rowNumber;
        let hasDuplicate = false;
        if (row.epf_no && existingEpf.has(row.epf_no.toUpperCase())) {
          errors.push({ row: rowNumber, message: `EPF No already exists: ${row.epf_no}` });
          hasDuplicate = true;
        }
        if (existingEmails.has(row.email.toLowerCase())) {
          errors.push({ row: rowNumber, message: `Email already exists: ${row.email}` });
          hasDuplicate = true;
        }
        if (!hasDuplicate) {
          dedupedValidRows.push(row);
        }
      }
      validRows.length = 0;
      validRows.push(...dedupedValidRows);
    }
  }

  return {
    totalRows: rawRows.length,
    validRows,
    rows: previewRows.slice(0, 50),
    errors,
  };
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}
