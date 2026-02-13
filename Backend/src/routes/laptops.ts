import { Router } from "express";
import { LaptopController } from "../controllers/laptopController.js";
import { roleMiddleware } from "../middleware/auth.js";

const router = Router();

// Admin-only operations
router.post("/", roleMiddleware("ADMIN"), LaptopController.createLaptop);
router.put("/:id", roleMiddleware("ADMIN"), LaptopController.updateLaptop);
router.delete("/:id", roleMiddleware("ADMIN"), LaptopController.deleteLaptop);

// Read operations for all authenticated users
router.get("/", LaptopController.getLaptops);
router.get("/:id", LaptopController.getLaptopById);

export default router;
