import { Router } from "express";
import { AuthController } from "../controllers/authController.js";

const router = Router();

router.get("/:id", AuthController.getUserById);

export default router;
