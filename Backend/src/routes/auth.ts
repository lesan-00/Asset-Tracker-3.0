import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";

const router = Router();

// Public routes
router.post("/login", AuthController.login);
router.post("/register", AuthController.register);
router.post("/logout", AuthController.logout);

// Protected routes
router.get("/me", authMiddleware, AuthController.getCurrentUser);
router.patch("/update", authMiddleware, roleMiddleware("ADMIN"), AuthController.updateUser);
router.post("/change-password", authMiddleware, AuthController.changePassword);

// Admin-only routes
router.get("/admin/users", authMiddleware, roleMiddleware("ADMIN"), AuthController.getAllUsers);
router.delete("/admin/users/:userId", authMiddleware, roleMiddleware("ADMIN"), AuthController.deleteUser);
router.patch("/admin/users/:userId/role", authMiddleware, roleMiddleware("ADMIN"), AuthController.updateUserRole);

export default router;
