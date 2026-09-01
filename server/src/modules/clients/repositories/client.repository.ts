import type {
  ClientActivity,
  ClientPreference,
  ClientRole,
  ClientRoleType,
  ClientTag,
} from "@prisma/client";
import type {
  ClientDetailRecord,
  ClientListOptions,
  ClientRecord,
  ClientUpdateData,
  ClientWriteData,
} from "../types/client.types.js";
import type {
  CreateActivityInput,
  CreateClientTagInput,
  CreatePreferenceInput,
  UpdateClientTagInput,
  UpdatePreferenceInput,
} from "../validators/client.validators.js";

export class DuplicateClientTagSlugError extends Error {}

export interface ClientRepository {
  create(data: ClientWriteData): Promise<ClientRecord>;
  list(
    options: ClientListOptions,
  ): Promise<{ records: ClientRecord[]; total: number }>;
  findById(
    agencyId: string,
    clientId: string,
    permittedAgentId?: string,
  ): Promise<ClientDetailRecord | null>;
  update(
    agencyId: string,
    clientId: string,
    data: ClientUpdateData,
    permittedAgentId?: string,
  ): Promise<ClientRecord | null>;
  softDelete(
    agencyId: string,
    clientId: string,
    deletedAt: Date,
  ): Promise<boolean>;
  isActiveUserInAgency(userId: string, agencyId: string): Promise<boolean>;
  assignAgent(
    agencyId: string,
    clientId: string,
    assignedAgentId: string | null,
  ): Promise<ClientRecord | null>;

  listRoles(
    agencyId: string,
    clientId: string,
    permittedAgentId?: string,
  ): Promise<ClientRole[] | null>;
  addRole(
    agencyId: string,
    clientId: string,
    role: ClientRoleType,
    permittedAgentId?: string,
  ): Promise<ClientRole | null>;
  removeRole(
    agencyId: string,
    clientId: string,
    role: ClientRoleType,
    permittedAgentId?: string,
  ): Promise<boolean | null>;

  listPreferences(
    agencyId: string,
    clientId: string,
    permittedAgentId?: string,
  ): Promise<ClientPreference[] | null>;
  createPreference(
    agencyId: string,
    clientId: string,
    input: CreatePreferenceInput,
    permittedAgentId?: string,
  ): Promise<ClientPreference | null>;
  updatePreference(
    agencyId: string,
    clientId: string,
    preferenceId: string,
    input: UpdatePreferenceInput,
    permittedAgentId?: string,
  ): Promise<ClientPreference | null>;
  softDeletePreference(
    agencyId: string,
    clientId: string,
    preferenceId: string,
    deletedAt: Date,
    permittedAgentId?: string,
  ): Promise<boolean | null>;

  listActivities(
    agencyId: string,
    clientId: string,
    permittedAgentId?: string,
  ): Promise<ClientActivity[] | null>;
  createActivity(
    agencyId: string,
    clientId: string,
    createdById: string,
    input: CreateActivityInput,
    permittedAgentId?: string,
  ): Promise<ClientActivity | null>;

  listTags(agencyId: string): Promise<ClientTag[]>;
  findTagById(agencyId: string, tagId: string): Promise<ClientTag | null>;
  createTag(agencyId: string, input: CreateClientTagInput): Promise<ClientTag>;
  updateTag(
    agencyId: string,
    tagId: string,
    input: UpdateClientTagInput,
  ): Promise<ClientTag | null>;
  softDeleteTag(
    agencyId: string,
    tagId: string,
    deletedAt: Date,
  ): Promise<boolean>;
  assignTag(
    agencyId: string,
    clientId: string,
    tagId: string,
    permittedAgentId?: string,
  ): Promise<boolean | null>;
  removeTag(
    agencyId: string,
    clientId: string,
    tagId: string,
    permittedAgentId?: string,
  ): Promise<boolean | null>;
}
