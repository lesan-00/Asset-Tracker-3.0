import { Request, Response } from "express";
import { z } from "zod";
import { AssetService } from "../services/assetService.js";
import {
  AssetStatusSchema,
  AssetTypeSchema,
  CreateAssetSchema,
  UpdateAssetSchema,
} from "../types/schemas.js";

const ListAssetsQuerySchema = z.object({
  type: AssetTypeSchema.optional(),
  status: AssetStatusSchema.optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const ListAssignableAssetsQuerySchema = z.object({
  type: AssetTypeSchema.optional(),
  search: z.string().optional(),
});

const SearchAssetsQuerySchema = z.object({
  q: z.string().optional(),
});
const SummaryQuerySchema = z.object({
  type: AssetTypeSchema.optional(),
});
const ImportAssetsSchema = z.object({
  fileName: z.string().min(1),
  fileContentBase64: z.string().min(1),
});

export class AssetController {
  static async getAssets(req: Request, res: Response) {
    try {
      const query = ListAssetsQuerySchema.parse(req.query);
      const result = await AssetService.listAssetsPaginated(
        {
        type: query.type,
        status: query.status,
        location: query.location,
        search: query.search,
        },
        query.page,
        query.pageSize
      );
      return res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors[0]?.message || "Invalid filters" });
      }
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch assets",
      });
    }
  }

  static async getAssetById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: "Invalid asset id" });
      }
      const asset = await AssetService.getAssetById(id);
      if (!asset) {
        return res.status(404).json({ success: false, error: "Asset not found" });
      }
      return res.json({ success: true, data: asset });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch asset",
      });
    }
  }

  static async createAsset(req: Request, res: Response) {
    try {
      const validated = CreateAssetSchema.parse(req.body);
      const created = await AssetService.createAsset({
        assetTag: validated.assetTag,
        assetType: validated.assetType,
        brand: validated.brand,
        model: validated.model,
        imeiNo: validated.imeiNo ?? null,
        serialNumber: validated.serialNumber ?? null,
        specifications: validated.specifications ?? null,
        department: validated.department ?? null,
        status: validated.status,
        location: validated.location,
        purchaseDate: validated.purchaseDate ?? null,
        warrantyEndDate: validated.warrantyEndDate ?? null,
        notes: validated.notes ?? null,
      });

      if (!created) {
        return res.status(500).json({ success: false, error: "Failed to create asset" });
      }
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors[0]?.message || "Invalid input" });
      }
      const statusCode = Number((error as any)?.statusCode || 400);
      return res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create asset",
      });
    }
  }

  static async updateAsset(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: "Invalid asset id" });
      }

      const validated = UpdateAssetSchema.parse(req.body);
      const updated = await AssetService.updateAsset(id, {
        assetTag: validated.assetTag,
        assetType: validated.assetType,
        brand: validated.brand,
        model: validated.model,
        imeiNo: validated.imeiNo,
        serialNumber: validated.serialNumber,
        specifications: validated.specifications,
        department: validated.department,
        status: validated.status,
        location: validated.location,
        purchaseDate: validated.purchaseDate,
        warrantyEndDate: validated.warrantyEndDate,
        notes: validated.notes,
      });
      if (!updated) {
        return res.status(404).json({ success: false, error: "Asset not found" });
      }
      return res.json({ success: true, data: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors[0]?.message || "Invalid input" });
      }
      const statusCode = Number((error as any)?.statusCode || 400);
      return res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update asset",
      });
    }
  }

  static async deleteAsset(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: "Invalid asset id" });
      }

      const result = await AssetService.deleteAssetPermanently(id);
      if (!result) {
        return res.status(404).json({ success: false, error: "Asset not found" });
      }
      return res.json({
        success: true,
        message: `Asset ${result.assetTag} deleted permanently`,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete asset",
      });
    }
  }

  static async getSummary(req: Request, res: Response) {
    try {
      const query = SummaryQuerySchema.parse(req.query);
      const summary = await AssetService.getInventorySummary({
        type: query.type,
      });
      return res.json({ success: true, data: summary });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors[0]?.message || "Invalid filters" });
      }
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to load assets summary",
      });
    }
  }

  static async getAssignableAssets(req: Request, res: Response) {
    try {
      const query = ListAssignableAssetsQuerySchema.parse(req.query);
      const assets = await AssetService.listAssignableAssets({
        type: query.type,
        search: query.search,
      });
      return res.json({ success: true, data: assets });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors[0]?.message || "Invalid filters" });
      }
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch assignable assets",
      });
    }
  }

  static async searchAssets(req: Request, res: Response) {
    try {
      const query = SearchAssetsQuerySchema.parse(req.query);
      const term = (query.q || "").trim();
      const results = await AssetService.searchAssets(term);
      return res.json({ success: true, data: results });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors[0]?.message || "Invalid query" });
      }
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to search assets",
      });
    }
  }

  static async downloadImportTemplate(req: Request, res: Response) {
    try {
      const csv = AssetService.getImportTemplateCsv();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="asset-import-template.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate template",
      });
    }
  }

  static async previewImportAssets(req: Request, res: Response) {
    try {
      const payload = ImportAssetsSchema.parse(req.body);
      const parsed = await AssetService.parseImportFile(payload.fileName, payload.fileContentBase64);
      return res.json({
        success: true,
        data: {
          summary: parsed.summary,
          columns: parsed.columns,
          rows: parsed.rows.slice(0, 50),
          totalRows: parsed.summary.totalRows,
          validCount: parsed.summary.validRows,
          invalidCount: parsed.summary.invalidRows,
          previewRows: parsed.rows.slice(0, 50),
          errors: parsed.errors,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors[0]?.message || "Invalid import payload" });
      }
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to preview import",
      });
    }
  }

  static async importAssets(req: Request, res: Response) {
    try {
      const payload = ImportAssetsSchema.parse(req.body);
      const parsed = await AssetService.parseImportFile(payload.fileName, payload.fileContentBase64);
      if (parsed.errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Validation failed. Fix row errors before import.",
          data: {
            summary: parsed.summary,
            columns: parsed.columns,
            rows: parsed.rows.slice(0, 50),
            totalRows: parsed.summary.totalRows,
            validCount: parsed.summary.validRows,
            invalidCount: parsed.summary.invalidRows,
            errors: parsed.errors,
          },
        });
      }

      const result = await AssetService.importAssetsFromRows(parsed.validRows);
      const hasInsertErrors = result.errors.length > 0;

      return res.status(hasInsertErrors ? 207 : 201).json({
        success: !hasInsertErrors,
        data: {
          summary: {
            totalRows: parsed.summary.totalRows,
            validRows: parsed.summary.validRows,
            invalidRows: result.errors.length,
            insertedRows: result.insertedCount,
          },
          totalRows: parsed.summary.totalRows,
          insertedCount: result.insertedCount,
          failedCount: result.errors.length,
          errors: result.errors,
        },
        message: hasInsertErrors
          ? "Import completed with some row errors."
          : "Assets imported successfully.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors[0]?.message || "Invalid import payload" });
      }
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to import assets",
      });
    }
  }
}
