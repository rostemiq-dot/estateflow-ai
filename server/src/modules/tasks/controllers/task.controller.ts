import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import type { TaskServiceContract } from "../services/task.service.js";
import type { ListTasksQuery } from "../validators/task.validators.js";

const actor = (value: AuthenticatedUser | undefined) => {
  if (!value) throw new AppError("Authentication required", 401);
  return value;
};
const param = (value: string | string[]) => Array.isArray(value) ? value[0] : value;

export class TaskController {
  constructor(private readonly service: TaskServiceContract) {}

  create: RequestHandler = async (req, res, next) => {
    try { res.status(201).json({ data: await this.service.create(actor(req.user), req.body) }); }
    catch (error) { next(error); }
  };
  list: RequestHandler = async (req, res, next) => {
    try { res.json(await this.service.list(actor(req.user), res.locals.validatedQuery as ListTasksQuery)); }
    catch (error) { next(error); }
  };
  get: RequestHandler = async (req, res, next) => {
    try { res.json({ data: await this.service.get(actor(req.user), param(req.params.taskId)) }); }
    catch (error) { next(error); }
  };
  update: RequestHandler = async (req, res, next) => {
    try { res.json({ data: await this.service.update(actor(req.user), param(req.params.taskId), req.body) }); }
    catch (error) { next(error); }
  };
  remove: RequestHandler = async (req, res, next) => {
    try { await this.service.remove(actor(req.user), param(req.params.taskId)); res.status(204).send(); }
    catch (error) { next(error); }
  };
}
