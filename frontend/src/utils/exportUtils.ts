export interface CSVExportOptions {
  filename?: string;
  includeHeaders?: boolean;
}

export function generateCSV<T extends Record<string, any>>(
  data: T[],
  options: CSVExportOptions = {}
): string {
  const { includeHeaders = true } = options;

  if (!data || data.length === 0) {
    return "";
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((item) =>
    headers
      .map((header) => {
        const value = item[header];

        // Handle nested objects (like specifications)
        if (typeof value === "object" && value !== null) {
          return `"${JSON.stringify(value)}"`;
        }

        // Escape quotes in strings
        const stringValue = String(value || "");
        return `"${stringValue.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csvContent = includeHeaders
    ? [headers.join(","), ...rows].join("\n")
    : rows.join("\n");

  return csvContent;
}

export function downloadCSV(
  data: Record<string, any>[],
  filename: string = "export.csv"
): void {
  const csv = generateCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string = "export.csv"
): void {
  downloadCSV(data, filename);
}
