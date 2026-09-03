import { UserRole, ViewingStatus, type Viewing } from "@prisma/client";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import {
  ViewingScheduleConflictError,
  type ViewingRepository,
} from "../repositories/viewing.repository.js";
import type { ViewingResponse } from "../types/viewing.types.js";
import type {
  CalendarQuery,
  CreateViewingInput,
  ListViewingsQuery,
  UpdateViewingInput,
} from "../validators/viewing.validators.js";
import { assertViewingTransition } from "./viewing-lifecycle.js";

type Clock = () => Date;
export interface ViewingServiceContract {
  create(actor: AuthenticatedUser, input: CreateViewingInput): Promise<ViewingResponse>;
  list(actor: AuthenticatedUser, query: ListViewingsQuery): Promise<{ data: ViewingResponse[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>;
  calendar(actor: AuthenticatedUser, query: CalendarQuery): Promise<ViewingResponse[]>;
  get(actor: AuthenticatedUser, id: string): Promise<ViewingResponse>;
  update(actor: AuthenticatedUser, id: string, input: UpdateViewingInput): Promise<ViewingResponse>;
  remove(actor: AuthenticatedUser, id: string): Promise<void>;
}

export class ViewingService implements ViewingServiceContract {
  constructor(private readonly repository: ViewingRepository, private readonly clock: Clock = () => new Date()) {}

  async create(actor: AuthenticatedUser, input: CreateViewingInput) {
    // The browser knows the Supabase auth user UUID, while the API authenticates
    // that account and maps it to the application's Prisma user UUID. Never use
    // the browser UUID as a foreign key into public.users.
    const normalizedInput: CreateViewingInput = {
      ...input,
      assignedAgentId: input.assignedAgentId ?? actor.id,
    };
    if (actor.role === UserRole.AGENT && normalizedInput.assignedAgentId !== actor.id) {
      throw new AppError("Agents may only assign viewings to themselves", 403);
    }
    await this.validateRelations(actor.agencyId, {
      propertyId: normalizedInput.propertyId,
      clientId: normalizedInput.clientId,
      dealId: normalizedInput.dealId ?? null,
      assignedAgentId: normalizedInput.assignedAgentId,
      creatorId: actor.id,
    });
    try {
      return toResponse(await this.repository.create(actor.agencyId, actor.id, normalizedInput));
    } catch (error) {
      throw mapConflict(error);
    }
  }

  async list(actor: AuthenticatedUser, query: ListViewingsQuery) {
    if (actor.role === UserRole.AGENT && query.assignedAgentId && query.assignedAgentId !== actor.id) {
      throw new AppError("Insufficient permissions", 403);
    }
    const { records, total } = await this.repository.list({
      ...query,
      agencyId: actor.agencyId,
      ...(actor.role === UserRole.AGENT ? { permittedAgentId: actor.id } : {}),
    });
    return {
      data: records.map(toResponse),
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    };
  }

  async calendar(actor: AuthenticatedUser, query: CalendarQuery) {
    return (await this.repository.calendar(actor.agencyId, new Date(query.startAt), new Date(query.endAt), permittedAgent(actor))).map(toResponse);
  }

  async get(actor: AuthenticatedUser, id: string) {
    return toResponse(await this.requireViewing(actor, id));
  }

  async update(actor: AuthenticatedUser, id: string, input: UpdateViewingInput) {
    const current = await this.requireViewing(actor, id);
    if (input.assignedAgentId !== undefined) requireManager(actor);
    const merged = {
      propertyId: input.propertyId ?? current.propertyId,
      clientId: input.clientId ?? current.clientId,
      dealId: input.dealId === undefined ? current.dealId : input.dealId,
      assignedAgentId: input.assignedAgentId ?? current.assignedAgentId,
      status: input.status ?? current.status,
      startAt: input.startAt ? new Date(input.startAt) : current.startAt,
      endAt: input.endAt ? new Date(input.endAt) : current.endAt,
      outcome: input.outcome === undefined ? current.outcome : input.outcome,
      cancellationReason: input.cancellationReason === undefined ? current.cancellationReason : input.cancellationReason,
      creatorId: current.createdById,
    };
    if (input.status !== undefined) assertViewingTransition(current.status, input.status);
    validateMergedState(merged);
    await this.validateRelations(actor.agencyId, merged);
    try {
      const updated = await this.repository.update(actor.agencyId, current, input, permittedAgent(actor));
      if (!updated) throw viewingNotFound();
      return toResponse(updated);
    } catch (error) {
      throw mapConflict(error);
    }
  }

  async remove(actor: AuthenticatedUser, id: string) {
    requireManager(actor);
    if (!(await this.repository.softDelete(actor.agencyId, id, this.clock()))) throw viewingNotFound();
  }

  private async requireViewing(actor: AuthenticatedUser, id: string) {
    const viewing = await this.repository.findById(actor.agencyId, id, permittedAgent(actor));
    if (!viewing) throw viewingNotFound();
    return viewing;
  }

  private async validateRelations(agencyId: string, value: { propertyId: string; clientId: string; dealId: string | null; assignedAgentId: string; creatorId: string }) {
    const valid = await this.repository.validateRelations(agencyId, value.propertyId, value.clientId, value.dealId, value.assignedAgentId, value.creatorId);
    if (!valid.property) throw new AppError("Property is unavailable", 400);
    if (!valid.client) throw new AppError("Client is unavailable", 400);
    if (!valid.deal) throw new AppError("Deal is unavailable", 400);
    if (!valid.agent) throw new AppError("Assigned agent is unavailable", 400);
    if (!valid.creator) throw new AppError("Viewing creator is unavailable", 400);
  }
}

const validateMergedState = (value: { status: ViewingStatus; startAt: Date; endAt: Date; outcome: string | null; cancellationReason: string | null }) => {
  if (value.startAt >= value.endAt) throw new AppError("startAt must be before endAt", 400);
  if (value.status === ViewingStatus.COMPLETED && !value.outcome?.trim()) throw new AppError("Outcome is required for completed viewings", 400);
  if (value.status === ViewingStatus.CANCELLED && !value.cancellationReason?.trim()) throw new AppError("Cancellation reason is required", 400);
};
const permittedAgent = (actor: AuthenticatedUser) => actor.role === UserRole.AGENT ? actor.id : undefined;
const requireManager = (actor: AuthenticatedUser) => { if (actor.role === UserRole.AGENT) throw new AppError("Insufficient permissions", 403); };
const viewingNotFound = () => new AppError("Viewing not found", 404);
const mapConflict = (error: unknown) => error instanceof ViewingScheduleConflictError ? new AppError("Assigned agent has an overlapping viewing", 409) : error;
const toResponse = (viewing: Viewing): ViewingResponse => {
  const record = { ...viewing };
  Reflect.deleteProperty(record, "deletedAt");
  return { ...record, createdAt: viewing.createdAt.toISOString(), updatedAt: viewing.updatedAt.toISOString() };
};
