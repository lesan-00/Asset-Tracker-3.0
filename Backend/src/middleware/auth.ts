import jwt, { Secret, SignOptions, VerifyOptions } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface JWTPayload {
  userId: string;
  email: string;
  role: "ADMIN" | "STAFF";
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

const JWT_SECRET: Secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const generateToken = (payload: JWTPayload): string => {
  const signOptions: SignOptions = { 
    expiresIn: JWT_EXPIRES_IN as unknown as SignOptions["expiresIn"]
  };
  return jwt.sign(payload, JWT_SECRET, signOptions);
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Missing or invalid authorization header",
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

export const roleMiddleware = (requiredRole: "ADMIN" | "STAFF") => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    if (req.user.role !== requiredRole) {
      res.status(403).json({
        success: false,
        error: `Access denied: ${requiredRole} role required`,
      });
      return;
    }

    next();
  };
};
