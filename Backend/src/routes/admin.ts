import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { roleMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/users/:id/reset-password", roleMiddleware("ADMIN"), AuthController.adminResetPassword);

export default router;

