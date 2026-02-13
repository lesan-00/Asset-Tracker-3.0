import { Request, Response } from "express";
import { LaptopModel } from "../models/Laptop.js";
import {
  CreateLaptopSchema,
  UpdateLaptopSchema,
} from "../types/schemas.js";

export class LaptopController {
  static async createLaptop(req: Request, res: Response) {
    try {
      const validated = CreateLaptopSchema.parse(req.body);
      const laptop = await LaptopModel.create({
        ...validated,
        purchaseDate: new Date(validated.purchaseDate),
        warrantyExpiry: new Date(validated.warrantyExpiry),
      });
      res.status(201).json({
        success: true,
        data: laptop,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async getLaptops(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const laptops =
        status && typeof status === "string"
          ? await LaptopModel.findByStatus(status)
          : await LaptopModel.findAll();
      res.json({
        success: true,
        data: laptops,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }

  static async getLaptopById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const laptop = await LaptopModel.findById(id);
      if (!laptop) {
        return res.status(404).json({
          success: false,
          error: "Laptop not found",
        });
      }
      res.json({
        success: true,
        data: laptop,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }

  static async updateLaptop(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validated = UpdateLaptopSchema.parse(req.body);
      const data: any = {
        ...validated,
      };
      if (validated.purchaseDate) {
        data.purchaseDate = new Date(validated.purchaseDate);
      }
      if (validated.warrantyExpiry) {
        data.warrantyExpiry = new Date(validated.warrantyExpiry);
      }
      const laptop = await LaptopModel.update(id, data);
      if (!laptop) {
        return res.status(404).json({
          success: false,
          error: "Laptop not found",
        });
      }
      res.json({
        success: true,
        data: laptop,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async deleteLaptop(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await LaptopModel.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Laptop not found",
        });
      }
      res.json({
        success: true,
        message: "Laptop deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }
}
