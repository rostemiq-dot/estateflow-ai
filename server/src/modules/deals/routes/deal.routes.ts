import { UserRole } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { createAuthenticate } from "../../auth/middleware/authenticate.js";
import { authorize } from "../../auth/middleware/authorize.js";
import { JwtTokenService } from "../../auth/services/jwt.service.js";
import { PrismaAuthRepository } from "../../auth/services/prisma-auth.repository.js";
import { validateRequest } from "../../properties/middleware/validate-request.js";
import { DealController } from "../controllers/deal.controller.js";
import { PrismaDealRepository } from "../repositories/prisma-deal.repository.js";
import {
  DealService,
  type DealServiceContract,
} from "../services/deal.service.js";
import {
  assignmentSchema,
  createDealSchema,
  createNoteSchema,
  dealParamsSchema,
  listDealsQuerySchema,
  stageChangeSchema,
  updateDealSchema,
  updateNoteSchema,
} from "../validators/deal.validators.js";
const all = authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT);
const managers = authorize(UserRole.OWNER, UserRole.ADMIN);
export const createDealRouter = (
  service: DealServiceContract,
  authenticate: RequestHandler,
) => {
  const r = Router(),
    c = new DealController(service);
  r.use(authenticate);
  r.post("/", all, validateRequest("body", createDealSchema), c.create);
  r.get("/", validateRequest("query", listDealsQuerySchema), c.list);
  r.get("/:dealId", validateRequest("params", dealParamsSchema), c.get);
  r.patch(
    "/:dealId",
    all,
    validateRequest("params", dealParamsSchema),
    validateRequest("body", updateDealSchema),
    c.update,
  );
  r.delete(
    "/:dealId",
    managers,
    validateRequest("params", dealParamsSchema),
    c.remove,
  );
  r.patch(
    "/:dealId/assignment",
    managers,
    validateRequest("params", dealParamsSchema),
    validateRequest("body", assignmentSchema),
    c.assign,
  );
  r.patch(
    "/:dealId/stage",
    all,
    validateRequest("params", dealParamsSchema),
    validateRequest("body", stageChangeSchema),
    c.stage,
  );
  r.get(
    "/:dealId/stage-history",
    validateRequest("params", dealParamsSchema),
    c.history,
  );
  r.get("/:dealId/notes", validateRequest("params", dealParamsSchema), c.notes);
  r.post(
    "/:dealId/notes",
    all,
    validateRequest("params", dealParamsSchema),
    validateRequest("body", createNoteSchema),
    c.createNote,
  );
  r.patch(
    "/:dealId/notes/:noteId",
    all,
    validateRequest("params", dealParamsSchema),
    validateRequest("body", updateNoteSchema),
    c.updateNote,
  );
  r.delete(
    "/:dealId/notes/:noteId",
    all,
    validateRequest("params", dealParamsSchema),
    c.deleteNote,
  );
  return r;
};
const auth = createAuthenticate(
  new JwtTokenService(),
  new PrismaAuthRepository(),
);
export const dealRouter = createDealRouter(
  new DealService(new PrismaDealRepository()),
  auth,
);
