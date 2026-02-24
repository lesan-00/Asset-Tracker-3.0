import { Request, Response } from "express";
import { AssetModel } from "../models/Asset.js";
import { CreateLaptopSchema, UpdateLaptopSchema } from "../types/schemas.js";

function toAssetStatus(laptopStatus: string): "IN_STOCK" | "ASSIGNED" | "IN_REPAIR" | "RETIRED" {
  if (laptopStatus === "AVAILABLE") return "IN_STOCK";
  if (laptopStatus === "MAINTENANCE") return "IN_REPAIR";
  if (laptopStatus === "ASSIGNED") return "ASSIGNED";
  return "RETIRED";
}

export class LaptopController {
  static async createLaptop(req: Request, res: Response) {
    try {
      const validated = CreateLaptopSchema.parse(req.body);
      const created = await AssetModel.create({
        assetTag: validated.assetTag,
        assetType: "LAPTOP",
        brand: validated.brand,
        model: validated.model,
        serialNumber: validated.serialNumber,
        specifications: validated.specifications ? JSON.stringify(validated.specifications) : null,
        department: validated.department,
        status: toAssetStatus(validated.status),
        location: validated.department || "Unassigned",
        purchaseDate: validated.purchaseDate.slice(0, 10),
        warrantyEndDate: validated.warrantyExpiry.slice(0, 10),
        notes: validated.notes,
      });

      await AssetModel.logActivity({
        action: "CREATE",
        entityType: "ASSET",
        entityId: String(created?.id || ""),
        message: `Created LAPTOP asset ${validated.assetTag}`,
      });

      const laptops = await AssetModel.getLaptopsLegacy();
      const laptop = laptops.find((l: any) => l.assetTag === validated.assetTag) || null;
      return res.status(201).json({ success: true, data: laptop });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async getLaptops(req: Request, res: Response) {
    try {
      const laptops = await AssetModel.getLaptopsLegacy();
      if (req.query.status && typeof req.query.status === "string") {
        return res.json({
          success: true,
          data: laptops.filter((item: any) => item.status === req.query.status),
        });
      }
      return res.json({ success: true, data: laptops });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }

  static async getLaptopById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: "Invalid laptop id" });
      }

      const asset = await AssetModel.findById(id);
      if (!asset || asset.assetType !== "LAPTOP") {
        return res.status(404).json({ success: false, error: "Laptop not found" });
      }

      const laptops = await AssetModel.getLaptopsLegacy();
      const laptop = laptops.find((item: any) => String(item.id) === String(id));
      return res.json({ success: true, data: laptop || null });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }

  static async updateLaptop(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: "Invalid laptop id" });
      }
      const validated = UpdateLaptopSchema.parse(req.body);

      const updated = await AssetModel.update(id, {
        assetTag: validated.assetTag,
        brand: validated.brand,
        model: validated.model,
        serialNumber: validated.serialNumber,
        specifications: validated.specifications ? JSON.stringify(validated.specifications) : undefined,
        department: validated.department,
        status: validated.status ? toAssetStatus(validated.status) : undefined,
        location: validated.department,
        purchaseDate: validated.purchaseDate ? validated.purchaseDate.slice(0, 10) : undefined,
        warrantyEndDate: validated.warrantyExpiry ? validated.warrantyExpiry.slice(0, 10) : undefined,
        notes: validated.notes,
      });
      if (!updated) {
        return res.status(404).json({ success: false, error: "Laptop not found" });
      }

      await AssetModel.logActivity({
        action: "UPDATE",
        entityType: "ASSET",
        entityId: String(id),
        message: `Updated LAPTOP asset ${updated.assetTag}`,
      });

      const laptops = await AssetModel.getLaptopsLegacy();
      const laptop = laptops.find((item: any) => String(item.id) === String(id));
      return res.json({ success: true, data: laptop || null });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async deleteLaptop(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: "Invalid laptop id" });
      }

      const asset = await AssetModel.findById(id);
      if (!asset || asset.assetType !== "LAPTOP") {
        return res.status(404).json({ success: false, error: "Laptop not found" });
      }

      const deleted = await AssetModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: "Laptop not found" });
      }

      await AssetModel.logActivity({
        action: "DELETE",
        entityType: "ASSET",
        entityId: String(id),
        message: `Deleted LAPTOP asset ${asset.assetTag}`,
      });

      return res.json({ success: true, message: "Laptop deleted successfully" });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }
}

