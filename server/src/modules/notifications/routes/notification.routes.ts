import { UserRole } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { createAuthenticate } from "../../auth/middleware/authenticate.js";
import { authorize } from "../../auth/middleware/authorize.js";
import { validateRequest } from "../../properties/middleware/validate-request.js";
import { NotificationController } from "../controllers/notification.controller.js";
import { PrismaNotificationRepository } from "../repositories/prisma-notification.repository.js";
import { NotificationService, type NotificationServiceContract } from "../services/notification.service.js";
import { createNotificationSchema, notificationParamsSchema } from "../validators/notification.validators.js";

const all = authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT);

export const createNotificationRouter = (service: NotificationServiceContract, authenticate: RequestHandler) => {
  const router = Router();
  const controller = new NotificationController(service);
  router.use(authenticate);
  router.get("/", controller.list);
  router.post("/", all, validateRequest("body", createNotificationSchema), controller.create);
  router.patch("/read-all", all, controller.markAllRead);
  router.patch("/:notificationId/read", all, validateRequest("params", notificationParamsSchema), controller.markRead);
  router.delete("/:notificationId", all, validateRequest("params", notificationParamsSchema), controller.remove);
  return router;
};

export const notificationRouter = createNotificationRouter(
  new NotificationService(new PrismaNotificationRepository()),
  createAuthenticate(),
);
