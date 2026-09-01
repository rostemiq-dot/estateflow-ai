import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import type { ViewingServiceContract } from "../services/viewing.service.js";
import type {
  CalendarQuery,
  ListViewingsQuery,
} from "../validators/viewing.validators.js";
const user = (value: AuthenticatedUser | undefined) => {
  if (!value) throw new AppError("Authentication required", 401);
  return value;
};
const param = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;
export class ViewingController {
  constructor(private readonly service: ViewingServiceContract) {}
  create: RequestHandler = async (req, res, next) => {
    try {
      res
        .status(201)
        .json({ data: await this.service.create(user(req.user), req.body) });
    } catch (error) {
      next(error);
    }
  };
  list: RequestHandler = async (req, res, next) => {
    try {
      res.json(
        await this.service.list(
          user(req.user),
          res.locals.validatedQuery as ListViewingsQuery,
        ),
      );
    } catch (error) {
      next(error);
    }
  };
  calendar: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.calendar(
          user(req.user),
          res.locals.validatedQuery as CalendarQuery,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  get: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.get(
          user(req.user),
          param(req.params.viewingId),
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
          param(req.params.viewingId),
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  remove: RequestHandler = async (req, res, next) => {
    try {
      await this.service.remove(user(req.user), param(req.params.viewingId));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
