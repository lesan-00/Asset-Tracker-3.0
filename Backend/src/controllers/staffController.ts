import { Request, Response } from "express";
import { StaffModel } from "../models/Staff.js";
import {
  CreateStaffSchema,
  UpdateStaffSchema,
} from "../types/schemas.js";

export class StaffController {
  static async createStaff(req: Request, res: Response) {
    try {
      const validated = CreateStaffSchema.parse(req.body);
      const staff = await StaffModel.create({
        ...validated,
        joinDate: new Date(validated.joinDate),
      });
      res.status(201).json({
        success: true,
        data: staff,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async getStaff(req: Request, res: Response) {
    try {
      const staff = await StaffModel.findAll();
      res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }

  static async getStaffById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const staff = await StaffModel.findById(id);
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: "Staff not found",
        });
      }
      res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }

  static async updateStaff(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validated = UpdateStaffSchema.parse(req.body);
      const data: any = {
        ...validated,
      };
      if (validated.joinDate) {
        data.joinDate = new Date(validated.joinDate);
      }
      const staff = await StaffModel.update(id, data);
      if (!staff) {
        return res.status(404).json({
          success: false,
          error: "Staff not found",
        });
      }
      res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async deleteStaff(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await StaffModel.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Staff not found",
        });
      }
      res.json({
        success: true,
        message: "Staff deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }
}
