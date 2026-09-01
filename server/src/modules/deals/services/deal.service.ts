import { UserRole, type Deal } from "@prisma/client";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import {
  ConcurrentDealUpdateError,
  type DealRepository,
} from "../repositories/deal.repository.js";
import type { DealResponse } from "../types/deal.types.js";
import type {
  CreateDealInput,
  ListDealsQuery,
  StageChangeInput,
  UpdateDealInput,
} from "../validators/deal.validators.js";

type Clock = () => Date;
export interface DealServiceContract {
  create(
    actor: AuthenticatedUser,
    input: CreateDealInput,
  ): Promise<DealResponse>;
  list(
    actor: AuthenticatedUser,
    query: ListDealsQuery,
  ): Promise<{
    data: DealResponse[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>;
  get(actor: AuthenticatedUser, id: string): Promise<DealResponse>;
  update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateDealInput,
  ): Promise<DealResponse>;
  remove(actor: AuthenticatedUser, id: string): Promise<void>;
  assign(
    actor: AuthenticatedUser,
    id: string,
    agentId: string,
  ): Promise<DealResponse>;
  changeStage(
    actor: AuthenticatedUser,
    id: string,
    input: StageChangeInput,
  ): Promise<DealResponse>;
  history(actor: AuthenticatedUser, id: string): Promise<unknown[]>;
  listNotes(actor: AuthenticatedUser, id: string): Promise<unknown[]>;
  createNote(
    actor: AuthenticatedUser,
    id: string,
    body: string,
  ): Promise<unknown>;
  updateNote(
    actor: AuthenticatedUser,
    id: string,
    noteId: string,
    body: string,
  ): Promise<unknown>;
  deleteNote(
    actor: AuthenticatedUser,
    id: string,
    noteId: string,
  ): Promise<void>;
}
export class DealService implements DealServiceContract {
  constructor(
    private readonly repo: DealRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}
  async create(actor: AuthenticatedUser, input: CreateDealInput) {
    if (actor.role === UserRole.AGENT && input.assignedAgentId !== actor.id)
      throw new AppError("Agents may only assign deals to themselves", 403);
    await this.validRelations(
      actor.agencyId,
      input.clientId,
      input.propertyId,
      input.assignedAgentId,
    );
    return response(await this.repo.create(actor.agencyId, actor.id, input));
  }
  async list(actor: AuthenticatedUser, query: ListDealsQuery) {
    if (
      actor.role === UserRole.AGENT &&
      query.assignedAgentId &&
      query.assignedAgentId !== actor.id
    )
      throw new AppError("Insufficient permissions", 403);
    const { records, total } = await this.repo.list({
      ...query,
      agencyId: actor.agencyId,
      ...(actor.role === UserRole.AGENT ? { permittedAgentId: actor.id } : {}),
    });
    return {
      data: records.map(response),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }
  async get(actor: AuthenticatedUser, id: string) {
    return response(await this.require(actor, id));
  }
  async update(actor: AuthenticatedUser, id: string, input: UpdateDealInput) {
    const current = await this.require(actor, id);
    if (
      input.status !== undefined &&
      (current.status === "WON" || current.status === "LOST")
    ) {
      throw new AppError("Closed deals cannot change status", 409);
    }
    const deal = await this.repo.update(
      actor.agencyId,
      id,
      input,
      permitted(actor),
    );
    if (!deal) throw notFound();
    return response(deal);
  }
  async remove(actor: AuthenticatedUser, id: string) {
    manager(actor);
    if (!(await this.repo.softDelete(actor.agencyId, id, this.clock())))
      throw notFound();
  }
  async assign(actor: AuthenticatedUser, id: string, agentId: string) {
    manager(actor);
    const current = await this.require(actor, id);
    await this.validRelations(
      actor.agencyId,
      current.clientId,
      current.propertyId,
      agentId,
    );
    const deal = await this.repo.assign(actor.agencyId, id, agentId);
    if (!deal) throw notFound();
    return response(deal);
  }
  async changeStage(
    actor: AuthenticatedUser,
    id: string,
    input: StageChangeInput,
  ) {
    const deal = await this.require(actor, id);
    if (deal.stage === input.stage)
      throw new AppError("Deal is already in this stage", 409);
    try {
      const changed = await this.repo.changeStage(
        actor.agencyId,
        deal,
        actor.id,
        input,
        permitted(actor),
      );
      if (!changed) throw notFound();
      return response(changed);
    } catch (error) {
      if (error instanceof ConcurrentDealUpdateError)
        throw new AppError("Deal was modified concurrently", 409);
      throw error;
    }
  }
  async history(actor: AuthenticatedUser, id: string) {
    const rows = await this.repo.history(actor.agencyId, id, permitted(actor));
    if (!rows) throw notFound();
    return rows;
  }
  async listNotes(actor: AuthenticatedUser, id: string) {
    const rows = await this.repo.listNotes(
      actor.agencyId,
      id,
      permitted(actor),
    );
    if (!rows) throw notFound();
    return rows;
  }
  async createNote(actor: AuthenticatedUser, id: string, body: string) {
    const note = await this.repo.createNote(
      actor.agencyId,
      id,
      actor.id,
      body,
      permitted(actor),
    );
    if (!note) throw notFound();
    return note;
  }
  async updateNote(
    actor: AuthenticatedUser,
    id: string,
    noteId: string,
    body: string,
  ) {
    const note = await this.repo.updateNote(
      actor.agencyId,
      id,
      noteId,
      body,
      permitted(actor),
    );
    if (!note) throw new AppError("Deal note not found", 404);
    return note;
  }
  async deleteNote(actor: AuthenticatedUser, id: string, noteId: string) {
    const result = await this.repo.deleteNote(
      actor.agencyId,
      id,
      noteId,
      this.clock(),
      permitted(actor),
    );
    if (result === null) throw notFound();
    if (!result) throw new AppError("Deal note not found", 404);
  }
  private async require(actor: AuthenticatedUser, id: string) {
    const deal = await this.repo.findById(actor.agencyId, id, permitted(actor));
    if (!deal) throw notFound();
    return deal;
  }
  private async validRelations(
    agency: string,
    client: string,
    property: string,
    agent: string,
  ) {
    const valid = await this.repo.validateRelations(
      agency,
      client,
      property,
      agent,
    );
    if (!valid.client) throw new AppError("Client is unavailable", 400);
    if (!valid.property) throw new AppError("Property is unavailable", 400);
    if (!valid.agent) throw new AppError("Assigned agent is unavailable", 400);
  }
}
const permitted = (a: AuthenticatedUser) =>
  a.role === UserRole.AGENT ? a.id : undefined;
const manager = (a: AuthenticatedUser) => {
  if (a.role === UserRole.AGENT)
    throw new AppError("Insufficient permissions", 403);
};
const notFound = () => new AppError("Deal not found", 404);
const response = (d: Deal): DealResponse => {
  const record = { ...d };
  Reflect.deleteProperty(record, "deletedAt");
  return {
    ...record,
    askingPrice: d.askingPrice?.toFixed(2) ?? null,
    offerAmount: d.offerAmount?.toFixed(2) ?? null,
    agreedAmount: d.agreedAmount?.toFixed(2) ?? null,
    expectedCommission: d.expectedCommission?.toString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
};
