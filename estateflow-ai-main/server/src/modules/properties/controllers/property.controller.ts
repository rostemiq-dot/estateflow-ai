import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import type { PropertyServiceContract } from "../services/property.service.js";
import type {
  CreatePropertyInput,
  ListPropertiesQuery,
  PropertyIdParams,
  UpdatePropertyInput,
} from "../validators/property.validators.js";

export class PropertyController {
  constructor(private readonly properties: PropertyServiceContract) {}

  create: RequestHandler = async (req, res, next) => {
    try {
      const actor = requireUser(req.user);
      const property = await this.properties.create(
        actor,
        req.body as CreatePropertyInput,
      );
      res.status(201).json({ data: property });
    } catch (error) {
      next(error);
    }
  };

  list: RequestHandler = async (req, res, next) => {
    try {
      const actor = requireUser(req.user);
      const result = await this.properties.list(
        actor,
        res.locals.validatedQuery as ListPropertiesQuery,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  detail: RequestHandler = async (req, res, next) => {
    try {
      const actor = requireUser(req.user);
      const { propertyId } = req.params as PropertyIdParams;
      const property = await this.properties.getById(actor, propertyId);
      res.status(200).json({ data: property });
    } catch (error) {
      next(error);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const actor = requireUser(req.user);
      const { propertyId } = req.params as PropertyIdParams;
      const property = await this.properties.update(
        actor,
        propertyId,
        req.body as UpdatePropertyInput,
      );
      res.status(200).json({ data: property });
    } catch (error) {
      next(error);
    }
  };

  remove: RequestHandler = async (req, res, next) => {
    try {
      const actor = requireUser(req.user);
      const { propertyId } = req.params as PropertyIdParams;
      await this.properties.remove(actor, propertyId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

const requireUser = (user: AuthenticatedUser | undefined) => {
  if (!user) {
    throw new AppError("Authentication required", 401);
  }

  return user;
};
