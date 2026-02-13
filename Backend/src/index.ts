import "dotenv/config";
import express from "express";
import { config } from "dotenv";
import cors from "cors";
import { initializeDatabase } from "./database/init.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { corsMiddleware, requestLogger } from "./middleware/common.js";
import { authMiddleware } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";
import laptopsRouter from "./routes/laptops.js";
import staffRouter from "./routes/staff.js";
import assignmentsRouter from "./routes/assignments.js";
import issuesRouter from "./routes/issues.js";
import accessoriesRouter from "./routes/accessories.js";
import settingsRouter from "./routes/settings.js";
import dashboardRouter from "./routes/dashboard.js";
import usersRouter from "./routes/users.js";

config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(corsMiddleware);
app.use(requestLogger);

// Routes
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (public)
app.use("/api/auth", authRouter);

// Protected routes
app.use("/api/laptops", authMiddleware, laptopsRouter);
app.use("/api/staff", authMiddleware, staffRouter);
app.use("/api/assignments", authMiddleware, assignmentsRouter);
app.use("/api/issues", authMiddleware, issuesRouter);
app.use("/api/accessories", accessoriesRouter); // GET public, POST/PATCH/DELETE protected
app.use("/api/settings", authMiddleware, settingsRouter);
app.use("/api/dashboard", authMiddleware, dashboardRouter);
app.use("/api/users", authMiddleware, usersRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // Keep the process alive
    process.on('SIGTERM', () => {
      server.close(() => process.exit(0));
    });
    process.on('SIGINT', () => {
      server.close(() => process.exit(0));
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
