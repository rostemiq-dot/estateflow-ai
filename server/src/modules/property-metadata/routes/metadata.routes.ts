import { UserRole, type Amenity, type PropertyTag } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { createAuthenticate } from "../../auth/middleware/authenticate.js";
import { authorize } from "../../auth/middleware/authorize.js";
import { validateRequest } from "../../properties/middleware/validate-request.js";
import { CatalogController, MediaController } from "../controllers/metadata.controller.js";
import { PrismaCatalogRepository, PrismaMediaRepository } from "../repositories/prisma-metadata.repository.js";
import {
  CatalogService,
  MediaService,
  type AmenityServiceContract,
  type MediaServiceContract,
  type TagServiceContract,
} from "../services/metadata.service.js";
import {
  catalogParamsSchema,
  createAmenitySchema,
  createMediaSchema,
  createTagSchema,
  propertyMediaParamsSchema,
  updateAmenitySchema,
  updateMediaSchema,
  updateTagSchema,
} from "../validators/metadata.validators.js";

const modifiers = authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT);
const catalogModifiers = authorize(UserRole.OWNER, UserRole.ADMIN);

export const createMediaRouter = (service: MediaServiceContract, authenticate: RequestHandler) => {
  const router = Router({ mergeParams: true });
  const controller = new MediaController(service);
  router.use(authenticate);
  router.get("/", validateRequest("params", propertyMediaParamsSchema), controller.list);
  router.post("/", modifiers, validateRequest("params", propertyMediaParamsSchema), validateRequest("body", createMediaSchema), controller.create);
  router.patch("/:mediaId", modifiers, validateRequest("params", propertyMediaParamsSchema), validateRequest("body", updateMediaSchema), controller.update);
  router.delete("/:mediaId", modifiers, validateRequest("params", propertyMediaParamsSchema), controller.remove);
  return router;
};

export const createCatalogRouter = (
  service: AmenityServiceContract | TagServiceContract,
  authenticate: RequestHandler,
  schemas: {
    create: typeof createAmenitySchema | typeof createTagSchema;
    update: typeof updateAmenitySchema | typeof updateTagSchema;
  },
) => {
  const router = Router();
  const controller = new CatalogController(service);
  router.use(authenticate);
  router.get("/", controller.list);
  router.get("/:id", validateRequest("params", catalogParamsSchema), controller.get);
  router.post("/", catalogModifiers, validateRequest("body", schemas.create), controller.create);
  router.patch("/:id", catalogModifiers, validateRequest("params", catalogParamsSchema), validateRequest("body", schemas.update), controller.update);
  router.delete("/:id", catalogModifiers, validateRequest("params", catalogParamsSchema), controller.remove);
  return router;
};

const authenticate = createAuthenticate();
export const mediaRouter = createMediaRouter(new MediaService(new PrismaMediaRepository()), authenticate);
export const amenityRouter = createCatalogRouter(
  new CatalogService("Amenity", new PrismaCatalogRepository<Amenity>("amenity")),
  authenticate,
  { create: createAmenitySchema, update: updateAmenitySchema },
);
export const tagRouter = createCatalogRouter(
  new CatalogService("Tag", new PrismaCatalogRepository<PropertyTag>("tag")),
  authenticate,
  { create: createTagSchema, update: updateTagSchema },
);
