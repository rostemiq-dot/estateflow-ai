import type { ClientRoleType } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import type {
  ClientServiceContract,
  ClientTagServiceContract,
} from "../services/client.service.js";
import type { ListClientsQuery } from "../validators/client.validators.js";

const actor = (user: AuthenticatedUser | undefined) => {
  if (!user) throw new AppError("Authentication required", 401);
  return user;
};
const param = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export class ClientController {
  constructor(private readonly service: ClientServiceContract) {}

  create: RequestHandler = async (req, res, next) => {
    try {
      res
        .status(201)
        .json({ data: await this.service.create(actor(req.user), req.body) });
    } catch (error) {
      next(error);
    }
  };
  list: RequestHandler = async (req, res, next) => {
    try {
      res.json(
        await this.service.list(
          actor(req.user),
          res.locals.validatedQuery as ListClientsQuery,
        ),
      );
    } catch (error) {
      next(error);
    }
  };
  get: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.get(
          actor(req.user),
          param(req.params.clientId),
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
          actor(req.user),
          param(req.params.clientId),
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  remove: RequestHandler = async (req, res, next) => {
    try {
      await this.service.remove(actor(req.user), param(req.params.clientId));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
  assign: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.assign(
          actor(req.user),
          param(req.params.clientId),
          req.body.assignedAgentId,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  listRoles: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.listRoles(
          actor(req.user),
          param(req.params.clientId),
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  addRole: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({
        data: await this.service.addRole(
          actor(req.user),
          param(req.params.clientId),
          req.body.role,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  removeRole: RequestHandler = async (req, res, next) => {
    try {
      await this.service.removeRole(
        actor(req.user),
        param(req.params.clientId),
        param(req.params.role) as ClientRoleType,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
  listPreferences: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.listPreferences(
          actor(req.user),
          param(req.params.clientId),
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  createPreference: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({
        data: await this.service.createPreference(
          actor(req.user),
          param(req.params.clientId),
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  updatePreference: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.updatePreference(
          actor(req.user),
          param(req.params.clientId),
          param(req.params.preferenceId),
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  removePreference: RequestHandler = async (req, res, next) => {
    try {
      await this.service.removePreference(
        actor(req.user),
        param(req.params.clientId),
        param(req.params.preferenceId),
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
  listActivities: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.listActivities(
          actor(req.user),
          param(req.params.clientId),
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  createActivity: RequestHandler = async (req, res, next) => {
    try {
      res.status(201).json({
        data: await this.service.createActivity(
          actor(req.user),
          param(req.params.clientId),
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  assignTag: RequestHandler = async (req, res, next) => {
    try {
      await this.service.assignTag(
        actor(req.user),
        param(req.params.clientId),
        param(req.params.tagId),
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
  removeTag: RequestHandler = async (req, res, next) => {
    try {
      await this.service.removeTag(
        actor(req.user),
        param(req.params.clientId),
        param(req.params.tagId),
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export class ClientTagController {
  constructor(private readonly service: ClientTagServiceContract) {}
  list: RequestHandler = async (req, res, next) => {
    try {
      res.json({ data: await this.service.list(actor(req.user)) });
    } catch (error) {
      next(error);
    }
  };
  get: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.get(actor(req.user), param(req.params.tagId)),
      });
    } catch (error) {
      next(error);
    }
  };
  create: RequestHandler = async (req, res, next) => {
    try {
      res
        .status(201)
        .json({ data: await this.service.create(actor(req.user), req.body) });
    } catch (error) {
      next(error);
    }
  };
  update: RequestHandler = async (req, res, next) => {
    try {
      res.json({
        data: await this.service.update(
          actor(req.user),
          param(req.params.tagId),
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  remove: RequestHandler = async (req, res, next) => {
    try {
      await this.service.remove(actor(req.user), param(req.params.tagId));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
