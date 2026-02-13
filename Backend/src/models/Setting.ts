import { query } from "../database/connection.js";

export interface AppSettings {
  organizationName: string;
  primaryDepartment: string;
}

const SETTINGS_ID = 1;

const defaultSettings: AppSettings = {
  organizationName: "Browns Plantations",
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
        organizationName: row.organization_name || defaultSettings.organizationName,
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
  static async saveAppSettings(settings: AppSettings): Promise<AppSettings> {
    try {
      await query(
        `INSERT INTO settings (id, organization_name, primary_department, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
         organization_name = VALUES(organization_name),
         primary_department = VALUES(primary_department),
         updated_at = CURRENT_TIMESTAMP`,
        [SETTINGS_ID, settings.organizationName, settings.primaryDepartment]
      );

      return this.getAppSettings();
    } catch (error) {
      console.error("[SettingModel] Error saving settings:", error);
      throw new Error("Failed to save settings");
    }
  }
}
