import { NextFunction, Response } from "express";
import { authMiddleware, AuthRequest } from "./auth.js";

export const requireAuth = authMiddleware;

export const requireRole = (roles: Array<"ADMIN" | "STAFF">) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Access denied",
      });
      return;
    }

    next();
  };
};
