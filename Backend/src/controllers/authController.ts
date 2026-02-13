import { Request, Response } from "express";
import { UserModel } from "../models/User.js";
import { StaffModel } from "../models/Staff.js";
import { generateToken, AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const RegisterSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name required"),
  userCode: z.string().min(1, "User code is required"),
  username: z.string().min(1, "Username is required"),
  location: z.string().min(1, "Location is required"),
  department: z.string().min(1, "Department is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
});

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const validated = LoginSchema.parse(req.body);

      const user = await UserModel.findByEmail(validated.email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      const isPasswordValid = await UserModel.verifyPassword(
        user,
        validated.password
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Return the user without querying again, just format it
      const userPublic = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userCode: user.userCode,
        username: user.username,
        location: user.location,
        department: user.department,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };

      res.json({
        success: true,
        data: {
          user: userPublic,
          token,
        },
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
        error: error instanceof Error ? error.message : "Login failed",
      });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const validated = RegisterSchema.parse(req.body);

      // Check if email already exists
      const existing = await UserModel.findByEmail(validated.email);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: "Email already registered",
        });
      }

      const existingUserCode = await UserModel.findByUserCode(validated.userCode);
      if (existingUserCode) {
        return res.status(400).json({
          success: false,
          error: "User code already in use",
        });
      }

      const existingUsername = await UserModel.findByUsername(validated.username);
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          error: "Username already in use",
        });
      }

      const user = await UserModel.create({
        email: validated.email,
        password: validated.password,
        fullName: validated.fullName,
        userCode: validated.userCode,
        username: validated.username,
        location: validated.location,
        department: validated.department,
        phoneNumber: validated.phoneNumber,
        role: validated.role,
      });

      // Keep staff directory in sync with account registration.
      if (user.role === "STAFF") {
        const existingStaff = await StaffModel.findByEmail(user.email);
        if (!existingStaff) {
          await StaffModel.create({
            name: user.fullName,
            email: user.email,
            department: user.department,
            position: "Staff",
            joinDate: new Date(),
            phoneNumber: user.phoneNumber,
          });
        }
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
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
        error: error instanceof Error ? error.message : "Registration failed",
      });
    }
  }

  static async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      const user = await UserModel.findById(req.user.userId);
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user",
      });
    }
  }

  static async logout(req: Request, res: Response) {
    // Logout is client-side in JWT (remove token from client)
    // Server can track token blacklist if needed
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  }

  static async updateUser(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      const UpdateUserSchema = z.object({
        fullName: z.string().min(2).optional(),
        email: z.string().email().optional(),
      });

      const validated = UpdateUserSchema.parse(req.body);
      const updated = await UserModel.update(req.user.userId, validated);

      res.json({
        success: true,
        data: updated,
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
        error: error instanceof Error ? error.message : "Update failed",
      });
    }
  }

  static async changePassword(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      const PasswordSchema = z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6, "New password must be at least 6 characters"),
      });

      const validated = PasswordSchema.parse(req.body);
      const user = await UserModel.findByEmail(req.user.email);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const isValid = await UserModel.verifyPassword(user, validated.currentPassword);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: "Current password is incorrect",
        });
      }

      await UserModel.updatePassword(req.user.userId, validated.newPassword);

      res.json({
        success: true,
        message: "Password changed successfully",
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
        error: error instanceof Error ? error.message : "Password change failed",
      });
    }
  }

  // Admin-only endpoints
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await UserModel.findAll();
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const deleted = await UserModel.deactivate(userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete user",
      });
    }
  }

  static async updateUserRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const RoleSchema = z.object({
        role: z.enum(["ADMIN", "STAFF"]),
      });

      RoleSchema.parse({ role });

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      await UserModel.update(userId, { role });

      const updated = await UserModel.findById(userId);
      res.json({
        success: true,
        data: updated,
        message: "User role updated successfully",
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
        error: error instanceof Error ? error.message : "Failed to update user role",
      });
    }
  }

  static async getUserById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      const { id } = req.params;
      const isAdmin = req.user.role === "ADMIN";
      const isSelf = req.user.userId === id;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      return res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user",
      });
    }
  }
}

