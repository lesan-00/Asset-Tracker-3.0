import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    success: false,
    message: "Request failed",
    error: error.message || "Internal server error",
  });
};

export const notFound = (req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
    error: "Route not found",
  });
};
