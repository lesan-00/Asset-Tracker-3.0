import { Router } from "express";
import { roleMiddleware } from "../middleware/auth.js";
import { UserController } from "../controllers/userController.js";

const router = Router();

router.get("/me", UserController.getMe);
router.get("/:id", roleMiddleware("ADMIN"), UserController.getById);
router.patch("/:id", roleMiddleware("ADMIN"), UserController.updateById);

export default router;
