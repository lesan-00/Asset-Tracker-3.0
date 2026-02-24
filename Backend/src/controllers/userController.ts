import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import { UserModel, UserPublic } from "../models/User.js";
import { StaffModel } from "../models/Staff.js";

const UpdateUserProfileSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  email: z.string().email().optional(),
  department: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  phoneNumber: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  accessGroups: z.array(z.string().trim().min(1)).optional(),
  accessLevel: z.string().trim().min(1).optional(),
});

export class UserController {
  static async getMe(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      return res.json({
        success: true,
        data: await serializeProfile(user),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch profile",
      });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      return res.json({
        success: true,
        data: await serializeProfile(user),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch profile",
      });
    }
  }

  static async updateById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validated = UpdateUserProfileSchema.parse(req.body);
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const updated = await UserModel.update(id, {
        fullName: validated.fullName,
        email: validated.email,
        department: validated.department,
        location: validated.location,
        phoneNumber: validated.phoneNumber,
        isActive:
          validated.status === undefined
            ? undefined
            : validated.status === "ACTIVE",
        accessGroups: validated.accessGroups,
        accessLevel: validated.accessLevel,
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      return res.json({
        success: true,
        data: await serializeProfile(updated),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors[0]?.message || "Invalid input",
        });
      }
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update profile",
      });
    }
  }
}

async function serializeProfile(user: UserPublic) {
  const staffRecord =
    user.role === "STAFF" && user.email
      ? await StaffModel.findByEmail(user.email)
      : null;
  return {
    id: user.id,
    name: user.fullName,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    department: user.department || "",
    location: user.location || "",
    phone: user.phoneNumber || "",
    phoneNumber: user.phoneNumber || "",
    status: user.isActive ? "ACTIVE" : "DISABLED",
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null,
    accessGroups: Array.isArray(user.accessGroups) ? user.accessGroups : [],
    accessLevel: user.accessLevel || "Standard",
    userCode: user.userCode,
    username: user.username,
    employeeName: staffRecord?.employeeName || user.fullName,
    epfNo: staffRecord?.epfNo || "",
  };
}
