import { Request, Response } from "express";
import { AccessoryModel, LaptopAccessoryModel } from "../models/Accessory.js";
import { AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

const CreateAccessorySchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional(),
});

export class AccessoryController {
  static async createAccessory(req: AuthRequest, res: Response) {
    try {
      const validated = CreateAccessorySchema.parse(req.body);
      const accessory = await AccessoryModel.create(validated);

      res.status(201).json({
        success: true,
        data: accessory,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0].message,
        });
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create accessory",
      });
    }
  }

  static async getAccessories(req: Request, res: Response) {
    try {
      const accessories = await AccessoryModel.findAll(true);
      const normalized = accessories.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.category,
        status: item.isActive ? "ACTIVE" : "INACTIVE",
        category: item.category,
        isActive: item.isActive,
      }));

      res.json({
        success: true,
        data: normalized,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch accessories",
      });
    }
  }

  static async getAccessoriesByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      const accessories = await AccessoryModel.findByCategory(category);

      res.json({
        success: true,
        data: accessories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch accessories",
      });
    }
  }

  static async getAccessoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const accessory = await AccessoryModel.findById(id);

      if (!accessory) {
        return res.status(404).json({
          success: false,
          error: "Accessory not found",
        });
      }

      res.json({
        success: true,
        data: accessory,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch accessory",
      });
    }
  }

  static async updateAccessory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const UpdateAccessorySchema = z.object({
        name: z.string().min(2).optional(),
        category: z.string().min(2).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      });

      const validated = UpdateAccessorySchema.parse(req.body);
      const accessory = await AccessoryModel.update(id, validated);

      if (!accessory) {
        return res.status(404).json({
          success: false,
          error: "Accessory not found",
        });
      }

      res.json({
        success: true,
        data: accessory,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0].message,
        });
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update accessory",
      });
    }
  }

  static async deleteAccessory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await AccessoryModel.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Accessory not found",
        });
      }

      res.json({
        success: true,
        message: "Accessory deleted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete accessory",
      });
    }
  }

  static async addAccessoryToLaptop(req: AuthRequest, res: Response) {
    try {
      const { laptopId } = req.params;
      const Schema = z.object({
        accessoryId: z.string(),
        quantity: z.number().min(1).optional(),
      });

      const validated = Schema.parse(req.body);
      const item = await LaptopAccessoryModel.addAccessory(
        laptopId,
        validated.accessoryId,
        validated.quantity || 1
      );

      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0].message,
        });
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to add accessory",
      });
    }
  }

  static async getLaptopAccessories(req: Request, res: Response) {
    try {
      const { laptopId } = req.params;
      const accessories = await LaptopAccessoryModel.findByLaptop(laptopId);

      res.json({
        success: true,
        data: accessories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch accessories",
      });
    }
  }

  static async updateAccessoryQuantity(req: AuthRequest, res: Response) {
    try {
      const { laptopId, accessoryId } = req.params;
      const Schema = z.object({
        quantity: z.number().min(1),
      });

      const validated = Schema.parse(req.body);
      const item = await LaptopAccessoryModel.updateQuantity(
        laptopId,
        accessoryId,
        validated.quantity
      );

      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Laptop accessory not found",
        });
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0].message,
        });
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update quantity",
      });
    }
  }

  static async removeAccessoryFromLaptop(req: AuthRequest, res: Response) {
    try {
      const { laptopId, accessoryId } = req.params;
      const deleted = await LaptopAccessoryModel.removeAccessory(laptopId, accessoryId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Laptop accessory not found",
        });
      }

      res.json({
        success: true,
        message: "Accessory removed from laptop",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to remove accessory",
      });
    }
  }
}
