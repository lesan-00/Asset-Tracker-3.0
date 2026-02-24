import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import {
  ReportsService,
  AssetRegisterFilters,
  ActiveAssignmentsFilters,
  AssignmentHistoryFilters,
  IssueSummaryFilters,
} from "../services/reportsService.js";
import {
  buildSimplePdfBuffer,
  buildXlsxBuffer,
  rowsToPdfLines,
  toDownloadFilename,
} from "../utils/reportExport.js";

const ExportFormatSchema = z.enum(["xlsx", "pdf"]).default("xlsx");
const MAX_EXPORT_ROWS = 10_000;

const AssetRegisterFiltersSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  search: z.string().optional(),
});

const ActiveAssignmentsFiltersSchema = z.object({
  targetType: z.enum(["STAFF", "LOCATION", "DEPARTMENT"]).optional(),
  search: z.string().optional(),
});

const AssignmentHistoryFiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
});

const IssueSummaryFiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export class ReportsController {
  static async getAssetRegister(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const filters = normalizeFilters(
        AssetRegisterFiltersSchema.parse(req.query)
      ) as AssetRegisterFilters;
      const rows = await ReportsService.getAssetRegister(filters, ReportsService.fromAuth(req));
      return res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      return handleReportsError(error, res, "Failed to load asset register report");
    }
  }

  static async exportAssetRegister(req: AuthRequest, res: Response) {
    return exportHandler(
      req,
      res,
      "asset-register",
      "Full Asset Register",
      AssetRegisterFiltersSchema,
      (filters, user) => ReportsService.getAssetRegister(filters as AssetRegisterFilters, user)
    );
  }

  static async getActiveAssignments(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }
      const filters = normalizeFilters(
        ActiveAssignmentsFiltersSchema.parse(req.query)
      ) as ActiveAssignmentsFilters;
      const rows = await ReportsService.getActiveAssignments(
        filters,
        ReportsService.fromAuth(req)
      );
      return res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      return handleReportsError(error, res, "Failed to load active assignments report");
    }
  }

  static async exportActiveAssignments(req: AuthRequest, res: Response) {
    return exportHandler(
      req,
      res,
      "active-assignments",
      "Active Assignments",
      ActiveAssignmentsFiltersSchema,
      (filters, user) => ReportsService.getActiveAssignments(filters as ActiveAssignmentsFilters, user)
    );
  }

  static async getIssueSummary(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }
      const filters = normalizeFilters(
        IssueSummaryFiltersSchema.parse(req.query)
      ) as IssueSummaryFilters;
      const summary = await ReportsService.getIssueSummary(filters, ReportsService.fromAuth(req));
      return res.json({ success: true, data: summary });
    } catch (error) {
      return handleReportsError(error, res, "Failed to load issue summary report");
    }
  }

  static async exportIssueSummary(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }
      const filters = normalizeFilters(
        IssueSummaryFiltersSchema.parse(req.query)
      ) as IssueSummaryFilters;
      const format = ExportFormatSchema.parse(req.query.format);
      const summary = await ReportsService.getIssueSummary(filters, ReportsService.fromAuth(req));

      if (format === "xlsx") {
        const buffer = await buildXlsxBuffer([
          {
            name: "Category Counts",
            rows: summary.categoryCounts.map((item) => ({
              category: item.category,
              count: item.count,
            })),
          },
          {
            name: "Status Counts",
            rows: summary.statusCounts.map((item) => ({
              status: item.status,
              count: item.count,
            })),
          },
          {
            name: "Asset Type Counts",
            rows: summary.assetTypeCounts.map((item) => ({
              assetType: item.assetType,
              count: item.count,
            })),
          },
          {
            name: "Top Problem Assets",
            rows: summary.problematicAssets.map((item) => ({ ...item })),
          },
        ]);
        const filename = toDownloadFilename("issue-summary", "xlsx");
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.status(200).send(buffer);
      }

      const lines = [
        "Category Counts",
        ...summary.categoryCounts.map((item) => `${item.category}: ${item.count}`),
        "",
        "Status Counts",
        ...summary.statusCounts.map((item) => `${item.status}: ${item.count}`),
        "",
        "Asset Type Counts",
        ...summary.assetTypeCounts.map((item) => `${item.assetType}: ${item.count}`),
        "",
        "Top Problematic Assets",
        ...summary.problematicAssets.map(
          (item) =>
            `${item.assetTag} (${item.assetType}) IMEI:${item.imeiNo} ${item.brand} ${item.model} -> ${item.issuesCount}`
        ),
      ];
      const pdf = buildSimplePdfBuffer("Issue Summary", lines);
      const filename = toDownloadFilename("issue-summary", "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(pdf);
    } catch (error) {
      return handleReportsError(error, res, "Failed to export issue summary report");
    }
  }

  static async getAssignmentHistory(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }
      const filters = normalizeFilters(
        AssignmentHistoryFiltersSchema.parse(req.query)
      ) as AssignmentHistoryFilters;
      const rows = await ReportsService.getAssignmentHistory(
        filters,
        ReportsService.fromAuth(req)
      );
      return res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      return handleReportsError(error, res, "Failed to load assignment history report");
    }
  }

  static async exportAssignmentHistory(req: AuthRequest, res: Response) {
    return exportHandler(
      req,
      res,
      "assignment-history",
      "Assignment History",
      AssignmentHistoryFiltersSchema,
      (filters, user) => ReportsService.getAssignmentHistory(filters as AssignmentHistoryFilters, user)
    );
  }
}

async function exportHandler<T extends Record<string, unknown>>(
  req: AuthRequest,
  res: Response,
  filenamePrefix: string,
  title: string,
  schema: z.ZodSchema,
  loader: (
    filters: Record<string, unknown>,
    user: ReturnType<typeof ReportsService.fromAuth>
  ) => Promise<T[]>
) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const filters = normalizeFilters(schema.parse(req.query));
    const format = ExportFormatSchema.parse(req.query.format);
    const rows = await loader(filters, ReportsService.fromAuth(req));

    if (rows.length > MAX_EXPORT_ROWS) {
      return res.status(413).json({
        success: false,
        error: `Export exceeds ${MAX_EXPORT_ROWS} rows. Apply filters or export a smaller date range.`,
      });
    }

    if (format === "xlsx") {
      const buffer = await buildXlsxBuffer([{ name: title, rows }]);
      const filename = toDownloadFilename(filenamePrefix, "xlsx");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(buffer);
    }

    const pdfRows = rows.slice(0, 2000);
    const pdfLines = rowsToPdfLines(pdfRows);
    if (rows.length > pdfRows.length) {
      pdfLines.push("");
      pdfLines.push(
        `PDF preview truncated at ${pdfRows.length} rows. Export XLSX for the full dataset.`
      );
    }
    const pdfBuffer = buildSimplePdfBuffer(title, pdfLines);
    const filename = toDownloadFilename(filenamePrefix, "pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return handleReportsError(error, res, `Failed to export ${title}`);
  }
}

function normalizeFilters<T extends Record<string, unknown>>(filters: T): T {
  const normalized = { ...filters };
  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];
    if (typeof value === "string" && value.trim() === "") {
      delete normalized[key];
    }
  });
  return normalized;
}

function handleReportsError(error: unknown, res: Response, fallback: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      error: error.errors[0]?.message || "Invalid report filters",
    });
  }
  return res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : fallback,
  });
}
