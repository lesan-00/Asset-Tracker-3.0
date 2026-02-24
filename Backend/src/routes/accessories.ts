import { Router } from "express";
import { AccessoryController } from "../controllers/accessoryController.js";
import { authMiddleware, roleMiddleware } from "../middleware/auth.js";

const router = Router();

// Admin-only routes
router.get("/", authMiddleware, roleMiddleware("ADMIN"), AccessoryController.getAccessories);
router.get(
  "/category/:category",
  authMiddleware,
  roleMiddleware("ADMIN"),
  AccessoryController.getAccessoriesByCategory
);
router.get("/:id", authMiddleware, roleMiddleware("ADMIN"), AccessoryController.getAccessoryById);
router.post("/", authMiddleware, roleMiddleware("ADMIN"), AccessoryController.createAccessory);
router.patch("/:id", authMiddleware, roleMiddleware("ADMIN"), AccessoryController.updateAccessory);
router.delete("/:id", authMiddleware, roleMiddleware("ADMIN"), AccessoryController.deleteAccessory);

// Legacy laptop accessories routes (admin only)
router.post(
  "/:laptopId/items",
  authMiddleware,
  roleMiddleware("ADMIN"),
  AccessoryController.addAccessoryToLaptop
);
router.get(
  "/:laptopId/items",
  authMiddleware,
  roleMiddleware("ADMIN"),
  AccessoryController.getLaptopAccessories
);
router.patch(
  "/:laptopId/items/:accessoryId",
  authMiddleware,
  roleMiddleware("ADMIN"),
  AccessoryController.updateAccessoryQuantity
);
router.delete(
  "/:laptopId/items/:accessoryId",
  authMiddleware,
  roleMiddleware("ADMIN"),
  AccessoryController.removeAccessoryFromLaptop
);

export default router;
