import { UserRole } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { createAuthenticate } from "../../auth/middleware/authenticate.js";
import { authorize } from "../../auth/middleware/authorize.js";
import { validateRequest } from "../../properties/middleware/validate-request.js";
import {
  ClientController,
  ClientTagController,
} from "../controllers/client.controller.js";
import { PrismaClientRepository } from "../repositories/prisma-client.repository.js";
import {
  ClientService,
  ClientTagService,
  type ClientServiceContract,
  type ClientTagServiceContract,
} from "../services/client.service.js";
import {
  addClientRoleSchema,
  assignClientSchema,
  clientChildParamsSchema,
  clientIdParamsSchema,
  createActivitySchema,
  createClientSchema,
  createClientTagSchema,
  createPreferenceSchema,
  listClientsQuerySchema,
  tagIdParamsSchema,
  updateClientSchema,
  updateClientTagSchema,
  updatePreferenceSchema,
} from "../validators/client.validators.js";

const allRoles = authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT);
const managers = authorize(UserRole.OWNER, UserRole.ADMIN);

export const createClientRouter = (
  service: ClientServiceContract,
  authenticate: RequestHandler,
) => {
  const router = Router();
  const controller = new ClientController(service);
  router.use(authenticate);
  router.post("/", allRoles, validateRequest("body", createClientSchema), controller.create);
  router.get("/", validateRequest("query", listClientsQuerySchema), controller.list);
  router.get("/:clientId", validateRequest("params", clientIdParamsSchema), controller.get);
  router.patch("/:clientId", allRoles, validateRequest("params", clientIdParamsSchema), validateRequest("body", updateClientSchema), controller.update);
  router.delete("/:clientId", managers, validateRequest("params", clientIdParamsSchema), controller.remove);
  router.patch("/:clientId/assignment", managers, validateRequest("params", clientIdParamsSchema), validateRequest("body", assignClientSchema), controller.assign);
  router.get("/:clientId/roles", validateRequest("params", clientIdParamsSchema), controller.listRoles);
  router.post("/:clientId/roles", allRoles, validateRequest("params", clientIdParamsSchema), validateRequest("body", addClientRoleSchema), controller.addRole);
  router.delete("/:clientId/roles/:role", allRoles, validateRequest("params", clientChildParamsSchema), controller.removeRole);
  router.get("/:clientId/preferences", validateRequest("params", clientIdParamsSchema), controller.listPreferences);
  router.post("/:clientId/preferences", allRoles, validateRequest("params", clientIdParamsSchema), validateRequest("body", createPreferenceSchema), controller.createPreference);
  router.patch("/:clientId/preferences/:preferenceId", allRoles, validateRequest("params", clientChildParamsSchema), validateRequest("body", updatePreferenceSchema), controller.updatePreference);
  router.delete("/:clientId/preferences/:preferenceId", allRoles, validateRequest("params", clientChildParamsSchema), controller.removePreference);
  router.get("/:clientId/activities", validateRequest("params", clientIdParamsSchema), controller.listActivities);
  router.post("/:clientId/activities", allRoles, validateRequest("params", clientIdParamsSchema), validateRequest("body", createActivitySchema), controller.createActivity);
  router.put("/:clientId/tags/:tagId", allRoles, validateRequest("params", clientChildParamsSchema), controller.assignTag);
  router.delete("/:clientId/tags/:tagId", allRoles, validateRequest("params", clientChildParamsSchema), controller.removeTag);
  return router;
};

export const createClientTagRouter = (
  service: ClientTagServiceContract,
  authenticate: RequestHandler,
) => {
  const router = Router();
  const controller = new ClientTagController(service);
  router.use(authenticate);
  router.get("/", controller.list);
  router.get("/:tagId", validateRequest("params", tagIdParamsSchema), controller.get);
  router.post("/", managers, validateRequest("body", createClientTagSchema), controller.create);
  router.patch("/:tagId", managers, validateRequest("params", tagIdParamsSchema), validateRequest("body", updateClientTagSchema), controller.update);
  router.delete("/:tagId", managers, validateRequest("params", tagIdParamsSchema), controller.remove);
  return router;
};

const authenticate = createAuthenticate();
const repository = new PrismaClientRepository();
export const clientRouter = createClientRouter(new ClientService(repository), authenticate);
export const clientTagRouter = createClientTagRouter(new ClientTagService(repository), authenticate);
