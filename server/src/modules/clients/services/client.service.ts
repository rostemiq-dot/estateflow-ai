import {
  UserRole,
  type ClientActivity,
  type ClientRoleType,
  type ClientTag,
} from "@prisma/client";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import {
  DuplicateClientTagSlugError,
  type ClientRepository,
} from "../repositories/client.repository.js";
import type {
  ClientDetailRecord,
  ClientRecord,
  ClientResponse,
  ClientUpdateData,
  ClientWriteData,
  PreferenceResponse,
} from "../types/client.types.js";
import type {
  CreateActivityInput,
  CreateClientInput,
  CreateClientTagInput,
  CreatePreferenceInput,
  ListClientsQuery,
  UpdateClientInput,
  UpdateClientTagInput,
  UpdatePreferenceInput,
} from "../validators/client.validators.js";

type Clock = () => Date;

export interface ClientServiceContract {
  create(
    actor: AuthenticatedUser,
    input: CreateClientInput,
  ): Promise<ClientResponse>;
  list(
    actor: AuthenticatedUser,
    query: ListClientsQuery,
  ): Promise<{
    data: ClientResponse[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>;
  get(
    actor: AuthenticatedUser,
    clientId: string,
  ): Promise<
    ClientResponse & {
      preferences: PreferenceResponse[];
    }
  >;
  update(
    actor: AuthenticatedUser,
    clientId: string,
    input: UpdateClientInput,
  ): Promise<ClientResponse>;
  remove(actor: AuthenticatedUser, clientId: string): Promise<void>;
  assign(
    actor: AuthenticatedUser,
    clientId: string,
    assignedAgentId: string | null,
  ): Promise<ClientResponse>;
  listRoles(
    actor: AuthenticatedUser,
    clientId: string,
  ): Promise<ClientRoleType[]>;
  addRole(
    actor: AuthenticatedUser,
    clientId: string,
    role: ClientRoleType,
  ): Promise<ClientRoleType>;
  removeRole(
    actor: AuthenticatedUser,
    clientId: string,
    role: ClientRoleType,
  ): Promise<void>;
  listPreferences(
    actor: AuthenticatedUser,
    clientId: string,
  ): Promise<PreferenceResponse[]>;
  createPreference(
    actor: AuthenticatedUser,
    clientId: string,
    input: CreatePreferenceInput,
  ): Promise<PreferenceResponse>;
  updatePreference(
    actor: AuthenticatedUser,
    clientId: string,
    preferenceId: string,
    input: UpdatePreferenceInput,
  ): Promise<PreferenceResponse>;
  removePreference(
    actor: AuthenticatedUser,
    clientId: string,
    preferenceId: string,
  ): Promise<void>;
  listActivities(
    actor: AuthenticatedUser,
    clientId: string,
  ): Promise<ClientActivity[]>;
  createActivity(
    actor: AuthenticatedUser,
    clientId: string,
    input: CreateActivityInput,
  ): Promise<ClientActivity>;
  assignTag(
    actor: AuthenticatedUser,
    clientId: string,
    tagId: string,
  ): Promise<void>;
  removeTag(
    actor: AuthenticatedUser,
    clientId: string,
    tagId: string,
  ): Promise<void>;
}

export class ClientService implements ClientServiceContract {
  constructor(
    private readonly repository: ClientRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async create(actor: AuthenticatedUser, input: CreateClientInput) {
    let assignedAgentId = input.assignedAgentId ?? null;
    if (actor.role === UserRole.AGENT) {
      if (assignedAgentId !== null && assignedAgentId !== actor.id) {
        throw new AppError("Agents may only assign clients to themselves", 403);
      }
      assignedAgentId = actor.id;
    } else {
      await this.validateAgent(actor.agencyId, assignedAgentId);
    }
    const data: ClientWriteData = {
      ...withoutAssignment(input),
      agencyId: actor.agencyId,
      assignedAgentId,
      fullName: fullName(input.firstName, input.lastName),
      nextFollowUpAt: toDate(input.nextFollowUpAt),
      lastContactAt: toDate(input.lastContactAt),
    };
    return toClient(await this.repository.create(data));
  }

  async list(actor: AuthenticatedUser, query: ListClientsQuery) {
    if (
      actor.role === UserRole.AGENT &&
      query.assignedAgentId &&
      query.assignedAgentId !== actor.id
    ) {
      throw new AppError("Insufficient permissions", 403);
    }
    const { records, total } = await this.repository.list({
      ...query,
      agencyId: actor.agencyId,
      ...(actor.role === UserRole.AGENT ? { permittedAgentId: actor.id } : {}),
    });
    return {
      data: records.map(toClient),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async get(actor: AuthenticatedUser, clientId: string) {
    const record = await this.repository.findById(
      actor.agencyId,
      clientId,
      permittedAgent(actor),
    );
    if (!record) throw clientNotFound();
    return {
      ...toClient(record),
      preferences: record.preferences.map(toPreference),
    };
  }

  async update(
    actor: AuthenticatedUser,
    clientId: string,
    input: UpdateClientInput,
  ) {
    if (input.assignedAgentId !== undefined) {
      this.requireManager(actor);
      await this.validateAgent(actor.agencyId, input.assignedAgentId);
    }
    const current = await this.requireClient(actor, clientId);
    const { nextFollowUpAt, lastContactAt, ...mutableInput } = input;
    const data: ClientUpdateData = {
      ...mutableInput,
      ...(input.firstName !== undefined || input.lastName !== undefined
        ? {
            fullName: fullName(
              input.firstName ?? current.firstName,
              input.lastName ?? current.lastName,
            ),
          }
        : {}),
      ...(nextFollowUpAt !== undefined
        ? { nextFollowUpAt: toDate(nextFollowUpAt) }
        : {}),
      ...(lastContactAt !== undefined
        ? { lastContactAt: toDate(lastContactAt) }
        : {}),
    };
    const updated = await this.repository.update(
      actor.agencyId,
      clientId,
      data,
      permittedAgent(actor),
    );
    if (!updated) throw clientNotFound();
    return toClient(updated);
  }

  async remove(actor: AuthenticatedUser, clientId: string) {
    this.requireManager(actor);
    if (
      !(await this.repository.softDelete(
        actor.agencyId,
        clientId,
        this.clock(),
      ))
    ) {
      throw clientNotFound();
    }
  }

  async assign(
    actor: AuthenticatedUser,
    clientId: string,
    assignedAgentId: string | null,
  ) {
    this.requireManager(actor);
    await this.validateAgent(actor.agencyId, assignedAgentId);
    const result = await this.repository.assignAgent(
      actor.agencyId,
      clientId,
      assignedAgentId,
    );
    if (!result) throw clientNotFound();
    return toClient(result);
  }

  async listRoles(actor: AuthenticatedUser, clientId: string) {
    const roles = await this.repository.listRoles(
      actor.agencyId,
      clientId,
      permittedAgent(actor),
    );
    if (!roles) throw clientNotFound();
    return roles.map(({ role }) => role);
  }

  async addRole(
    actor: AuthenticatedUser,
    clientId: string,
    role: ClientRoleType,
  ) {
    const result = await this.repository.addRole(
      actor.agencyId,
      clientId,
      role,
      permittedAgent(actor),
    );
    if (!result) throw clientNotFound();
    return result.role;
  }

  async removeRole(
    actor: AuthenticatedUser,
    clientId: string,
    role: ClientRoleType,
  ) {
    const result = await this.repository.removeRole(
      actor.agencyId,
      clientId,
      role,
      permittedAgent(actor),
    );
    if (result === null) throw clientNotFound();
    if (!result) throw new AppError("Client role not found", 404);
  }

  async listPreferences(actor: AuthenticatedUser, clientId: string) {
    const records = await this.repository.listPreferences(
      actor.agencyId,
      clientId,
      permittedAgent(actor),
    );
    if (!records) throw clientNotFound();
    return records.map(toPreference);
  }

  async createPreference(
    actor: AuthenticatedUser,
    clientId: string,
    input: CreatePreferenceInput,
  ) {
    const record = await this.repository.createPreference(
      actor.agencyId,
      clientId,
      input,
      permittedAgent(actor),
    );
    if (!record) throw clientNotFound();
    return toPreference(record);
  }

  async updatePreference(
    actor: AuthenticatedUser,
    clientId: string,
    preferenceId: string,
    input: UpdatePreferenceInput,
  ) {
    const record = await this.repository.updatePreference(
      actor.agencyId,
      clientId,
      preferenceId,
      input,
      permittedAgent(actor),
    );
    if (!record) throw new AppError("Client preference not found", 404);
    return toPreference(record);
  }

  async removePreference(
    actor: AuthenticatedUser,
    clientId: string,
    preferenceId: string,
  ) {
    const result = await this.repository.softDeletePreference(
      actor.agencyId,
      clientId,
      preferenceId,
      this.clock(),
      permittedAgent(actor),
    );
    if (result === null) throw clientNotFound();
    if (!result) throw new AppError("Client preference not found", 404);
  }

  async listActivities(actor: AuthenticatedUser, clientId: string) {
    const records = await this.repository.listActivities(
      actor.agencyId,
      clientId,
      permittedAgent(actor),
    );
    if (!records) throw clientNotFound();
    return records;
  }

  async createActivity(
    actor: AuthenticatedUser,
    clientId: string,
    input: CreateActivityInput,
  ) {
    const record = await this.repository.createActivity(
      actor.agencyId,
      clientId,
      actor.id,
      input,
      permittedAgent(actor),
    );
    if (!record) throw clientNotFound();
    return record;
  }

  async assignTag(actor: AuthenticatedUser, clientId: string, tagId: string) {
    const result = await this.repository.assignTag(
      actor.agencyId,
      clientId,
      tagId,
      permittedAgent(actor),
    );
    if (!result) throw new AppError("Client or tag not found", 404);
  }

  async removeTag(actor: AuthenticatedUser, clientId: string, tagId: string) {
    const result = await this.repository.removeTag(
      actor.agencyId,
      clientId,
      tagId,
      permittedAgent(actor),
    );
    if (result === null) throw clientNotFound();
    if (!result) throw new AppError("Client tag assignment not found", 404);
  }

  private requireManager(actor: AuthenticatedUser) {
    if (actor.role === UserRole.AGENT) {
      throw new AppError("Insufficient permissions", 403);
    }
  }

  private async validateAgent(agencyId: string, agentId: string | null) {
    if (
      agentId !== null &&
      !(await this.repository.isActiveUserInAgency(agentId, agencyId))
    ) {
      throw new AppError("Assigned agent is unavailable", 400);
    }
  }

  private async requireClient(actor: AuthenticatedUser, clientId: string) {
    const record = await this.repository.findById(
      actor.agencyId,
      clientId,
      permittedAgent(actor),
    );
    if (!record) throw clientNotFound();
    return record;
  }
}

export interface ClientTagServiceContract {
  list(actor: AuthenticatedUser): Promise<ClientTag[]>;
  get(actor: AuthenticatedUser, tagId: string): Promise<ClientTag>;
  create(
    actor: AuthenticatedUser,
    input: CreateClientTagInput,
  ): Promise<ClientTag>;
  update(
    actor: AuthenticatedUser,
    tagId: string,
    input: UpdateClientTagInput,
  ): Promise<ClientTag>;
  remove(actor: AuthenticatedUser, tagId: string): Promise<void>;
}

export class ClientTagService implements ClientTagServiceContract {
  constructor(
    private readonly repository: ClientRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}
  list(actor: AuthenticatedUser) {
    return this.repository.listTags(actor.agencyId);
  }
  async get(actor: AuthenticatedUser, tagId: string) {
    const tag = await this.repository.findTagById(actor.agencyId, tagId);
    if (!tag) throw tagNotFound();
    return tag;
  }
  async create(actor: AuthenticatedUser, input: CreateClientTagInput) {
    try {
      return await this.repository.createTag(actor.agencyId, input);
    } catch (error) {
      throw mapTagWriteError(error);
    }
  }
  async update(
    actor: AuthenticatedUser,
    tagId: string,
    input: UpdateClientTagInput,
  ) {
    try {
      const tag = await this.repository.updateTag(actor.agencyId, tagId, input);
      if (!tag) throw tagNotFound();
      return tag;
    } catch (error) {
      throw mapTagWriteError(error);
    }
  }
  async remove(actor: AuthenticatedUser, tagId: string) {
    if (
      !(await this.repository.softDeleteTag(
        actor.agencyId,
        tagId,
        this.clock(),
      ))
    ) {
      throw tagNotFound();
    }
  }
}

const withoutAssignment = (value: CreateClientInput) => {
  const input = { ...value };
  Reflect.deleteProperty(input, "assignedAgentId");
  Reflect.deleteProperty(input, "nextFollowUpAt");
  Reflect.deleteProperty(input, "lastContactAt");
  return input;
};
const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);
const fullName = (firstName: string, lastName: string) =>
  `${firstName.trim()} ${lastName.trim()}`;
const permittedAgent = (actor: AuthenticatedUser) =>
  actor.role === UserRole.AGENT ? actor.id : undefined;
const clientNotFound = () => new AppError("Client not found", 404);
const tagNotFound = () => new AppError("Client tag not found", 404);
const mapTagWriteError = (error: unknown) =>
  error instanceof DuplicateClientTagSlugError
    ? new AppError("Client tag slug already exists", 409)
    : error;

const toClient = (client: ClientRecord | ClientDetailRecord) => {
  const { roles, tags, ...recordWithDeletedAt } = client;
  const record = { ...recordWithDeletedAt };
  Reflect.deleteProperty(record, "deletedAt");
  return {
    ...record,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    roles: roles.map(({ role }) => role),
    tags: tags.map(({ tag }) => tag),
  };
};
const toPreference = (
  preference: ClientDetailRecord["preferences"][number],
) => ({
  ...preference,
  minArea: preference.minArea?.toFixed(2) ?? null,
  maxArea: preference.maxArea?.toFixed(2) ?? null,
  minBudget: preference.minBudget?.toFixed(2) ?? null,
  maxBudget: preference.maxBudget?.toFixed(2) ?? null,
});
