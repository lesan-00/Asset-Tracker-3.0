import { Request, Response } from "express";
import { z } from "zod";
import { SettingModel } from "../models/Setting.js";

const AppSettingsSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  primaryDepartment: z.string().min(1, "Primary department is required"),
});

export class SettingController {
  /**
   * GET /api/settings
   * Returns current application settings.
   * Requires authentication.
   */
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await SettingModel.getAppSettings();
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("[SettingController] Error fetching settings:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to load settings",
      });
    }
  }

  /**
   * PUT /api/settings
   * Updates application settings.
   * Requires authentication and ADMIN role.
   */
  static async saveSettings(req: Request, res: Response) {
    try {
      const validated = AppSettingsSchema.parse(req.body);
      const saved = await SettingModel.saveAppSettings(validated);
      res.json({
        success: true,
        data: saved,
        message: "Settings saved successfully",
      });
    } catch (error) {
      console.error("[SettingController] Error saving settings:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: error.errors[0].message || "Validation failed",
        });
      } else {
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : "Invalid settings payload",
        });
      }
    }
  }
}
