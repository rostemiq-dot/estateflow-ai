import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import type { NotificationServiceContract } from "../services/notification.service.js";

const actor = (value: AuthenticatedUser | undefined) => {
  if (!value) throw new AppError("Authentication required", 401);
  return value;
};
const param = (value: string | string[]) => Array.isArray(value) ? value[0] : value;

export class NotificationController {
  constructor(private readonly service: NotificationServiceContract) {}

  list: RequestHandler = async (req, res, next) => {
    try { res.json({ data: await this.service.list(actor(req.user)) }); }
    catch (error) { next(error); }
  };
  create: RequestHandler = async (req, res, next) => {
    try { res.status(201).json({ data: await this.service.create(actor(req.user), req.body) }); }
    catch (error) { next(error); }
  };
  markRead: RequestHandler = async (req, res, next) => {
    try { res.json({ data: { count: await this.service.markRead(actor(req.user), req.params.notificationId ? param(req.params.notificationId) : undefined) } }); }
    catch (error) { next(error); }
  };
  markAllRead: RequestHandler = async (req, res, next) => {
    try { res.json({ data: { count: await this.service.markRead(actor(req.user)) } }); }
    catch (error) { next(error); }
  };
  remove: RequestHandler = async (req, res, next) => {
    try { await this.service.remove(actor(req.user), param(req.params.notificationId)); res.status(204).send(); }
    catch (error) { next(error); }
  };
}
