import { UserRole } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { createAuthenticate } from "../../auth/middleware/authenticate.js";
import { authorize } from "../../auth/middleware/authorize.js";
import { validateRequest } from "../../properties/middleware/validate-request.js";
import { ViewingController } from "../controllers/viewing.controller.js";
import { PrismaViewingRepository } from "../repositories/prisma-viewing.repository.js";
import { ViewingService, type ViewingServiceContract } from "../services/viewing.service.js";
import {
  calendarQuerySchema,
  createViewingSchema,
  listViewingsQuerySchema,
  updateViewingSchema,
  viewingParamsSchema,
} from "../validators/viewing.validators.js";

const all = authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT);
const managers = authorize(UserRole.OWNER, UserRole.ADMIN);

export const createViewingRouter = (service: ViewingServiceContract, authenticate: RequestHandler) => {
  const router = Router();
  const controller = new ViewingController(service);
  router.use(authenticate);
  router.post("/", all, validateRequest("body", createViewingSchema), controller.create);
  router.get("/", validateRequest("query", listViewingsQuerySchema), controller.list);
  router.get("/calendar", validateRequest("query", calendarQuerySchema), controller.calendar);
  router.get("/:viewingId", validateRequest("params", viewingParamsSchema), controller.get);
  router.patch("/:viewingId", all, validateRequest("params", viewingParamsSchema), validateRequest("body", updateViewingSchema), controller.update);
  router.delete("/:viewingId", managers, validateRequest("params", viewingParamsSchema), controller.remove);
  return router;
};

export const viewingRouter = createViewingRouter(
  new ViewingService(new PrismaViewingRepository()),
  createAuthenticate(),
);
