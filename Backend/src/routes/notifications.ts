import { Router } from "express";
import { NotificationController } from "../controllers/notificationController.js";

const router = Router();

router.get("/", NotificationController.getNotifications);
router.get("/unread-count", NotificationController.getUnreadCount);
router.patch("/:id/read", NotificationController.markAsRead);
router.patch("/read-all", NotificationController.markAllAsRead);

export default router;
