import ExcelJS from "exceljs";

export interface ReportSheet {
  name: string;
  rows: Array<Record<string, unknown>>;
}

export async function buildXlsxBuffer(sheets: ReportSheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));
    const rows = sheet.rows.length ? sheet.rows : [{ info: "No data" }];
    const headers = Object.keys(rows[0]);

    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(40, Math.max(16, header.length + 4)),
    }));

    rows.forEach((row) => {
      const normalized: Record<string, string | number | boolean | null> = {};
      headers.forEach((header) => {
        const value = row[header];
        normalized[header] = normalizeExcelValue(value);
      });
      worksheet.addRow(normalized);
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function buildSimplePdfBuffer(title: string, lines: string[]): Buffer {
  const pageLines = [title, "", ...lines.slice(0, 45)];
  const content = [
    "BT",
    "/F1 10 Tf",
    "45 780 Td",
    ...pageLines.map((line, index) => `${index === 0 ? "" : "T* "}(${escapePdfText(line)}) Tj`),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content, "utf8")} >> stream\n${content}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export function rowsToPdfLines(rows: Array<Record<string, unknown>>): string[] {
  if (!rows.length) {
    return ["No data"];
  }
  return rows.map((row) =>
    Object.entries(row)
      .map(([key, value]) => `${key}: ${String(value ?? "-")}`)
      .join(" | ")
  );
}

export function toDownloadFilename(prefix: string, format: "xlsx" | "pdf"): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${date}.${format}`;
}

function normalizeExcelValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return JSON.stringify(value);
}

function escapePdfText(value: string): string {
  return value
    .split("\\")
    .join("\\\\")
    .split("(")
    .join("\\(")
    .split(")")
    .join("\\)");
}

