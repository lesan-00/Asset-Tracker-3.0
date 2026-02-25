import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: Error & { statusCode?: number; status?: number },
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  const status = error.statusCode || error.status || 500;

  return res.status(status).json({
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
