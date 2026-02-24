import { query } from "../database/connection.js";
import { ORGANIZATION_NAME } from "../config/system.js";

export interface AppSettings {
  organizationName: string;
  primaryDepartment: string;
}

const SETTINGS_ID = 1;

const defaultSettings: AppSettings = {
  organizationName: ORGANIZATION_NAME,
  primaryDepartment: "IT Department",
};

export class SettingModel {
  static getDefaults(): AppSettings {
    return { ...defaultSettings };
  }

  /**
   * Get application settings from the database.
   * If no settings exist, returns default values.
   */
  static async getAppSettings(): Promise<AppSettings> {
    try {
      const result = await query(
        `SELECT organization_name, primary_department FROM settings WHERE id = ?`,
        [SETTINGS_ID]
      );
      const rows = result.rows as any[];
      if (!rows || rows.length === 0) {
        return this.getDefaults();
      }

      const row = rows[0];
      return {
        organizationName: ORGANIZATION_NAME,
        primaryDepartment: row.primary_department || defaultSettings.primaryDepartment,
      };
    } catch (error) {
      console.error("[SettingModel] Error fetching settings:", error);
      return this.getDefaults();
    }
  }

  /**
   * Save (upsert) application settings to the database.
   */
  static async saveAppSettings(settings: { primaryDepartment: string }): Promise<AppSettings> {
    try {
      await query(
        `INSERT INTO settings (id, organization_name, primary_department, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
         primary_department = VALUES(primary_department),
         updated_at = CURRENT_TIMESTAMP`,
        [SETTINGS_ID, ORGANIZATION_NAME, settings.primaryDepartment]
      );

      return this.getAppSettings();
    } catch (error) {
      console.error("[SettingModel] Error saving settings:", error);
      throw new Error("Failed to save settings");
    }
  }
}
