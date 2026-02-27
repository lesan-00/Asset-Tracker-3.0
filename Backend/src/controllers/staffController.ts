import { Request, Response } from "express";
import { StaffModel } from "../models/Staff.js";
import { query } from "../database/connection.js";
import {
  CreateStaffSchema,
  UpdateStaffSchema,
} from "../types/schemas.js";
import { z } from "zod";

const SearchStaffQuerySchema = z.object({
  q: z.string().optional(),
});
const ListStaffQuerySchema = z.object({
  search: z.string().optional(),
});

export class StaffController {
  static async createStaff(req: Request, res: Response) {
    try {
      const validated = CreateStaffSchema.parse({
        employeeName: req.body.employee_name ?? req.body.employeeName ?? req.body.name,
        epfNo: req.body.epf_no ?? req.body.epfNo ?? null,
        email: req.body.email,
        department: req.body.department,
        location: req.body.location,
        phoneNumber: req.body.phone ?? req.body.phoneNumber,
        status: req.body.status,
        position: req.body.position,
        joinDate: req.body.joinDate,
      });

      if (validated.epfNo) {
        const existingEpf = await StaffModel.findByEpfNo(validated.epfNo);
        if (existingEpf) {
          return res.status(409).json({
            success: false,
            error: "EPF No already exists",
          });
        }
      }

      const staff = await StaffModel.create({
        employeeName: validated.employeeName,
        epfNo: validated.epfNo,
        email: validated.email,
        department: validated.department,
        location: validated.location,
        phoneNumber: validated.phoneNumber,
        status: validated.status === "INACTIVE" ? "DISABLED" : validated.status,
        position: validated.position,
        joinDate: validated.joinDate ? new Date(validated.joinDate) : undefined,
      });
      res.status(201).json({
        success: true,
        data: staff,
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          error: "EPF No already exists",
        });
      }
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid input",
      });
    }
  }

  static async getStaff(req: Request, res: Response) {
    try {
      const query = ListStaffQuerySchema.parse(req.query);
      const hasSearch = Boolean(query.search && query.search.trim().length > 0);
      const staff = await StaffModel.findAll({
        search: query.search,
        limit: hasSearch ? 20 : undefined,
      });
      res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0]?.message || "Invalid query",
        });
      }
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

      const staffEmail = String((staff as any).email || "").trim().toLowerCase();
      const staffName = String((staff as any).employeeName || (staff as any).name || "").trim().toLowerCase();
      const staffEpf = String((staff as any).epfNo || "").trim().toUpperCase();

      const assignmentsResult = await query(
        `SELECT
           a.id,
           a.status,
           a.assigned_date as assignedDate,
           ass.id as assetId,
           ass.asset_tag as assetTag,
           ass.asset_type as assetType,
           ass.brand,
           ass.model,
           l.id as laptopId,
           l.asset_tag as laptopAssetTag,
           l.brand as laptopBrand,
           l.model as laptopModel
         FROM assignments a
         LEFT JOIN assets ass ON ass.id = a.asset_id
         LEFT JOIN staff s ON s.id = a.staff_id
         LEFT JOIN users ru ON ru.id = a.receiver_user_id
         LEFT JOIN laptops l ON l.id = a.laptop_id
         WHERE
           a.staff_id = ?
           OR (
             ? <> ''
             AND (
               LOWER(COALESCE(s.email, '')) = ?
               OR LOWER(COALESCE(ru.email, '')) = ?
             )
           )
           OR (
             ? <> ''
             AND LOWER(COALESCE(s.employee_name, s.name, '')) = ?
           )
           OR (
             ? <> ''
             AND UPPER(COALESCE(s.epf_no, '')) = ?
           )
         ORDER BY a.assigned_date DESC, a.created_at DESC`,
        [id, staffEmail, staffEmail, staffEmail, staffName, staffName, staffEpf, staffEpf]
      );

      const assignedAssets = (assignmentsResult.rows as any[]).map((row) => {
        const hasAsset = row.assetId !== null && row.assetId !== undefined;
        const hasLaptop = row.laptopId !== null && row.laptopId !== undefined;
        const tag = hasAsset ? row.assetTag : hasLaptop ? row.laptopAssetTag : null;
        const brand = hasAsset ? row.brand : hasLaptop ? row.laptopBrand : null;
        const model = hasAsset ? row.model : hasLaptop ? row.laptopModel : null;

        return {
          assignmentId: String(row.id),
          status: String(row.status || ""),
          assignedDate: row.assignedDate ? new Date(row.assignedDate).toISOString() : null,
          asset: hasAsset || hasLaptop
            ? {
                id: hasAsset ? Number(row.assetId) : null,
                assetTag: String(tag || ""),
                assetType: String(row.assetType || "LAPTOP"),
                label: `${tag || `#${row.id}`} - ${brand || ""} ${model || ""}`.trim(),
              }
            : null,
        };
      });

      res.json({
        success: true,
        data: {
          ...staff,
          assignedAssets,
        },
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
      const validated = UpdateStaffSchema.parse({
        employeeName: req.body.employee_name ?? req.body.employeeName ?? req.body.name,
        epfNo: req.body.epf_no ?? req.body.epfNo ?? null,
        email: req.body.email,
        department: req.body.department,
        location: req.body.location,
        phoneNumber: req.body.phone ?? req.body.phoneNumber,
        status: req.body.status,
        position: req.body.position,
        joinDate: req.body.joinDate,
      });

      if (validated.epfNo !== undefined && validated.epfNo !== null) {
        const existing = await StaffModel.findByEpfNo(validated.epfNo);
        if (existing && existing.id !== id) {
          return res.status(409).json({
            success: false,
            error: "EPF No already exists",
          });
        }
      }

      const data: any = {
        ...validated,
        status: validated.status === "INACTIVE" ? "DISABLED" : validated.status,
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
      if ((error as { code?: string })?.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          error: "EPF No already exists",
        });
      }
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
      const errorWithCode = error as Error & { code?: string };
      if (errorWithCode.code === "STAFF_HAS_ASSIGNMENTS") {
        return res.status(409).json({
          success: false,
          error: errorWithCode.message,
        });
      }
      if (errorWithCode.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
          success: false,
          error:
            "Cannot delete staff member with existing assignments. Reassign or remove their assignments first.",
        });
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }

  static async searchStaff(req: Request, res: Response) {
    try {
      const query = SearchStaffQuerySchema.parse(req.query);
      const term = (query.q || "").trim();
      const results = await StaffModel.search(term);
      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0]?.message || "Invalid query",
        });
      }
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      });
    }
  }
}
