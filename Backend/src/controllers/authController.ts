import { Request, Response } from "express";
import { UserModel } from "../models/User.js";
import { generateToken, AuthRequest } from "../middleware/auth.js";
import { z } from "zod";
import crypto from "crypto";

const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const AdminResetPasswordSchema = z
  .object({
    tempPassword: z.string().min(8).optional(),
    generate: z.boolean().optional(),
  })
  .refine(
    (value) => Boolean(value.generate) || Boolean(value.tempPassword),
    "Provide tempPassword or set generate=true"
  );

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
      if (user.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          error: "Access restricted to administrators",
        });
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      await UserModel.updateLastLogin(user.id);
      const refreshedUser = await UserModel.findById(user.id);
      if (!refreshedUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Return the user without querying again, just format it
      const userPublic = {
        ...refreshedUser,
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
    return res.status(403).json({
      success: false,
      error: "Registration is disabled. Access is restricted to administrators.",
    });
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
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }
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
      const updated = await UserModel.findById(req.user.userId);

      res.json({
        success: true,
        message: "Password changed successfully",
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

  static async adminResetPassword(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
      }

      const { id } = req.params;
      const validated = AdminResetPasswordSchema.parse(req.body ?? {});
      const targetUser = await UserModel.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      if (targetUser.id === req.user.userId) {
        return res.status(400).json({
          success: false,
          error: "Use change-password for your own account",
        });
      }

      const tempPassword =
        validated.generate || !validated.tempPassword
          ? generateTemporaryPassword()
          : validated.tempPassword;

      await UserModel.resetPasswordByAdmin(targetUser.id, tempPassword);
      await UserModel.logPasswordReset({
        adminUserId: req.user.userId,
        targetUserId: targetUser.id,
        message: `Admin reset password for user ${targetUser.email}`,
      });

      if (validated.generate || !validated.tempPassword) {
        return res.json({
          success: true,
          data: {
            userId: targetUser.id,
            tempPassword,
          },
        });
      }

      return res.json({
        success: true,
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
        error: error instanceof Error ? error.message : "Failed to reset password",
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

function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

