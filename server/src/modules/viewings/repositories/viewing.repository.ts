import type { Viewing } from "@prisma/client";
import type {
  ViewingListOptions,
  ViewingRecord,
} from "../types/viewing.types.js";
import type {
  CreateViewingInput,
  UpdateViewingInput,
} from "../validators/viewing.validators.js";
export class ViewingScheduleConflictError extends Error {
  constructor() {
    super("Viewing schedule conflict");
    this.name = "ViewingScheduleConflictError";
  }
}
export interface ViewingRepository {
  validateRelations(
    agencyId: string,
    propertyId: string,
    clientId: string,
    dealId: string | null,
    agentId: string,
    creatorId: string,
  ): Promise<{
    property: boolean;
    client: boolean;
    deal: boolean;
    agent: boolean;
    creator: boolean;
  }>;
  create(
    agencyId: string,
    createdById: string,
    input: CreateViewingInput,
  ): Promise<ViewingRecord>;
  list(
    options: ViewingListOptions,
  ): Promise<{ records: ViewingRecord[]; total: number }>;
  calendar(
    agencyId: string,
    startAt: Date,
    endAt: Date,
    permittedAgentId?: string,
  ): Promise<ViewingRecord[]>;
  findById(
    agencyId: string,
    viewingId: string,
    permittedAgentId?: string,
  ): Promise<ViewingRecord | null>;
  update(
    agencyId: string,
    current: Viewing,
    input: UpdateViewingInput,
    permittedAgentId?: string,
  ): Promise<ViewingRecord | null>;
  softDelete(
    agencyId: string,
    viewingId: string,
    deletedAt: Date,
  ): Promise<boolean>;
}
