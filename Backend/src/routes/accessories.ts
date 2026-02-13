import { Router } from "express";
import { AccessoryController } from "../controllers/accessoryController.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";

const router = Router();

// Authenticated GET routes
router.get("/", authMiddleware, AccessoryController.getAccessories);
router.get("/category/:category", authMiddleware, AccessoryController.getAccessoriesByCategory);
router.get("/:id", authMiddleware, AccessoryController.getAccessoryById);

// Protected routes (ADMIN only for write operations)
router.post("/", authMiddleware, roleMiddleware("ADMIN"), AccessoryController.createAccessory);
router.patch("/:id", authMiddleware, roleMiddleware("ADMIN"), AccessoryController.updateAccessory);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), AccessoryController.deleteAccessory);

// Laptop accessories routes
router.post("/:laptopId/items", authMiddleware, AccessoryController.addAccessoryToLaptop);
router.get("/:laptopId/items", AccessoryController.getLaptopAccessories);
router.patch("/:laptopId/items/:accessoryId", authMiddleware, AccessoryController.updateAccessoryQuantity);
router.delete("/:laptopId/items/:accessoryId", authMiddleware, AccessoryController.removeAccessoryFromLaptop);

export default router;
