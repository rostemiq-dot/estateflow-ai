import { UserRole } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { createAuthenticate } from "../../auth/middleware/authenticate.js";
import { authorize } from "../../auth/middleware/authorize.js";
import { validateRequest } from "../../properties/middleware/validate-request.js";
import { TaskController } from "../controllers/task.controller.js";
import { PrismaTaskRepository } from "../repositories/prisma-task.repository.js";
import { TaskService, type TaskServiceContract } from "../services/task.service.js";
import { createTaskSchema, listTasksQuerySchema, taskParamsSchema, updateTaskSchema } from "../validators/task.validators.js";

const all = authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT);
const managers = authorize(UserRole.OWNER, UserRole.ADMIN);

export const createTaskRouter = (service: TaskServiceContract, authenticate: RequestHandler) => {
  const router = Router();
  const controller = new TaskController(service);
  router.use(authenticate);
  router.post("/", all, validateRequest("body", createTaskSchema), controller.create);
  router.get("/", validateRequest("query", listTasksQuerySchema), controller.list);
  router.get("/:taskId", validateRequest("params", taskParamsSchema), controller.get);
  router.patch("/:taskId", all, validateRequest("params", taskParamsSchema), validateRequest("body", updateTaskSchema), controller.update);
  router.delete("/:taskId", managers, validateRequest("params", taskParamsSchema), controller.remove);
  return router;
};

export const taskRouter = createTaskRouter(
  new TaskService(new PrismaTaskRepository()),
  createAuthenticate(),
);
