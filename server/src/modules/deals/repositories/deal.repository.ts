import type { Deal, DealNote, DealStageHistory } from "@prisma/client";
import type { DealListOptions, DealRecord } from "../types/deal.types.js";
import type {
  CreateDealInput,
  StageChangeInput,
  UpdateDealInput,
} from "../validators/deal.validators.js";

export class ConcurrentDealUpdateError extends Error {}
export interface DealRepository {
  validateRelations(
    agencyId: string,
    clientId: string,
    propertyId: string,
    agentId: string,
  ): Promise<{ client: boolean; property: boolean; agent: boolean }>;
  create(
    agencyId: string,
    createdById: string,
    input: CreateDealInput,
  ): Promise<DealRecord>;
  list(
    options: DealListOptions,
  ): Promise<{ records: DealRecord[]; total: number }>;
  findById(
    agencyId: string,
    dealId: string,
    permittedAgentId?: string,
  ): Promise<DealRecord | null>;
  update(
    agencyId: string,
    dealId: string,
    input: UpdateDealInput,
    permittedAgentId?: string,
  ): Promise<DealRecord | null>;
  softDelete(
    agencyId: string,
    dealId: string,
    deletedAt: Date,
  ): Promise<boolean>;
  assign(
    agencyId: string,
    dealId: string,
    agentId: string,
  ): Promise<DealRecord | null>;
  changeStage(
    agencyId: string,
    deal: Deal,
    changedById: string,
    input: StageChangeInput,
    permittedAgentId?: string,
  ): Promise<DealRecord | null>;
  history(
    agencyId: string,
    dealId: string,
    permittedAgentId?: string,
  ): Promise<DealStageHistory[] | null>;
  listNotes(
    agencyId: string,
    dealId: string,
    permittedAgentId?: string,
  ): Promise<DealNote[] | null>;
  createNote(
    agencyId: string,
    dealId: string,
    createdById: string,
    body: string,
    permittedAgentId?: string,
  ): Promise<DealNote | null>;
  updateNote(
    agencyId: string,
    dealId: string,
    noteId: string,
    body: string,
    permittedAgentId?: string,
  ): Promise<DealNote | null>;
  deleteNote(
    agencyId: string,
    dealId: string,
    noteId: string,
    deletedAt: Date,
    permittedAgentId?: string,
  ): Promise<boolean | null>;
}
