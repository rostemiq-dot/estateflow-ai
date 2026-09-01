import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import type {
  AmenityServiceContract,
  MediaServiceContract,
  TagServiceContract,
} from "../services/metadata.service.js";

const user = (actor: AuthenticatedUser | undefined) => {
  if (!actor) throw new AppError("Authentication required", 401);
  return actor;
};
const param = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export class MediaController {
  constructor(private readonly service: MediaServiceContract) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.list(
          user(req.user),
          param(req.params.propertyId),
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  create: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({
        data: await this.service.create(
          user(req.user),
          param(req.params.propertyId),
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  update: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.update(
          user(req.user),
          param(req.params.propertyId),
          param(req.params.mediaId),
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  remove: RequestHandler = async (req, res, next) => {
    try {
      await this.service.remove(
        user(req.user),
        param(req.params.propertyId),
        param(req.params.mediaId),
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

type CatalogControllerService = AmenityServiceContract | TagServiceContract;
export class CatalogController {
  constructor(private readonly service: CatalogControllerService) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      res.json({ data: await this.service.list(user(req.user)) });
    } catch (error) {
      next(error);
    }
  };
  get: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.get(user(req.user), param(req.params.id)),
      });
    } catch (error) {
      next(error);
    }
  };
  create: RequestHandler = async (req, res, next) => {
    try {
      res
        .status(201)
        .json({ data: await this.service.create(user(req.user), req.body) });
    } catch (error) {
      next(error);
    }
  };
  update: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.update(
          user(req.user),
          param(req.params.id),
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  remove: RequestHandler = async (req, res, next) => {
    try {
      await this.service.remove(user(req.user), param(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
