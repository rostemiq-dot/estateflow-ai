import { UserRole } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { createAuthenticate } from "../../auth/middleware/authenticate.js";
import { authorize } from "../../auth/middleware/authorize.js";
import { JwtTokenService } from "../../auth/services/jwt.service.js";
import { PrismaAuthRepository } from "../../auth/services/prisma-auth.repository.js";
import { PropertyController } from "../controllers/property.controller.js";
import { validateRequest } from "../middleware/validate-request.js";
import { PrismaPropertyRepository } from "../repositories/prisma-property.repository.js";
import {
  PropertyService,
  type PropertyServiceContract,
} from "../services/property.service.js";
import {
  createPropertySchema,
  listPropertiesQuerySchema,
  propertyIdParamsSchema,
  updatePropertySchema,
} from "../validators/property.validators.js";

type PropertyRouterDependencies = {
  propertyService: PropertyServiceContract;
  authenticate: RequestHandler;
};

export const createPropertyRouter = ({
  propertyService,
  authenticate,
}: PropertyRouterDependencies) => {
  const router = Router();
  const controller = new PropertyController(propertyService);

  router.use(authenticate);
  router.post(
    "/",
    authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT),
    validateRequest("body", createPropertySchema),
    controller.create,
  );
  router.get(
    "/",
    validateRequest("query", listPropertiesQuerySchema),
    controller.list,
  );
  router.get(
    "/:propertyId",
    validateRequest("params", propertyIdParamsSchema),
    controller.detail,
  );
  router.patch(
    "/:propertyId",
    validateRequest("params", propertyIdParamsSchema),
    validateRequest("body", updatePropertySchema),
    controller.update,
  );
  router.delete(
    "/:propertyId",
    authorize(UserRole.OWNER, UserRole.ADMIN),
    validateRequest("params", propertyIdParamsSchema),
    controller.remove,
  );

  return router;
};

const authRepository = new PrismaAuthRepository();
const propertyService = new PropertyService(new PrismaPropertyRepository());

export const propertyRouter = createPropertyRouter({
  propertyService,
  authenticate: createAuthenticate(new JwtTokenService(), authRepository),
});
