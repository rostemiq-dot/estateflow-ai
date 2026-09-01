import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import type { DealServiceContract } from "../services/deal.service.js";
import type { ListDealsQuery } from "../validators/deal.validators.js";
const user = (u: AuthenticatedUser | undefined) => {
  if (!u) throw new AppError("Authentication required", 401);
  return u;
};
const p = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);
export class DealController {
  constructor(private readonly service: DealServiceContract) {}
  create: RequestHandler = async (q, s, n) => {
    try {
      s.status(201).json({
        data: await this.service.create(user(q.user), q.body),
      });
    } catch (e) {
      n(e);
    }
  };
  list: RequestHandler = async (q, s, n) => {
    try {
      s.json(
        await this.service.list(
          user(q.user),
          s.locals.validatedQuery as ListDealsQuery,
        ),
      );
    } catch (e) {
      n(e);
    }
  };
  get: RequestHandler = async (q, s, n) => {
    try {
      s.json({
        data: await this.service.get(user(q.user), p(q.params.dealId)),
      });
    } catch (e) {
      n(e);
    }
  };
  update: RequestHandler = async (q, s, n) => {
    try {
      s.json({
        data: await this.service.update(
          user(q.user),
          p(q.params.dealId),
          q.body,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
  remove: RequestHandler = async (q, s, n) => {
    try {
      await this.service.remove(user(q.user), p(q.params.dealId));
      s.status(204).send();
    } catch (e) {
      n(e);
    }
  };
  assign: RequestHandler = async (q, s, n) => {
    try {
      s.json({
        data: await this.service.assign(
          user(q.user),
          p(q.params.dealId),
          q.body.assignedAgentId,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
  stage: RequestHandler = async (q, s, n) => {
    try {
      s.json({
        data: await this.service.changeStage(
          user(q.user),
          p(q.params.dealId),
          q.body,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
  history: RequestHandler = async (q, s, n) => {
    try {
      s.json({
        data: await this.service.history(user(q.user), p(q.params.dealId)),
      });
    } catch (e) {
      n(e);
    }
  };
  notes: RequestHandler = async (q, s, n) => {
    try {
      s.json({
        data: await this.service.listNotes(user(q.user), p(q.params.dealId)),
      });
    } catch (e) {
      n(e);
    }
  };
  createNote: RequestHandler = async (q, s, n) => {
    try {
      s.status(201).json({
        data: await this.service.createNote(
          user(q.user),
          p(q.params.dealId),
          q.body.body,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
  updateNote: RequestHandler = async (q, s, n) => {
    try {
      s.json({
        data: await this.service.updateNote(
          user(q.user),
          p(q.params.dealId),
          p(q.params.noteId),
          q.body.body,
        ),
      });
    } catch (e) {
      n(e);
    }
  };
  deleteNote: RequestHandler = async (q, s, n) => {
    try {
      await this.service.deleteNote(
        user(q.user),
        p(q.params.dealId),
        p(q.params.noteId),
      );
      s.status(204).send();
    } catch (e) {
      n(e);
    }
  };
}
