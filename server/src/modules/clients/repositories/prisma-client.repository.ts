import {
  Prisma,
  type ClientActivity,
  type ClientPreference,
  type ClientRole,
  type ClientRoleType,
  type ClientTag,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
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
import {
  DuplicateClientTagSlugError,
  type ClientRepository,
} from "./client.repository.js";

type ClientDatabase = Pick<
  PrismaClient,
  | "client"
  | "user"
  | "clientRole"
  | "clientPreference"
  | "clientActivity"
  | "clientTag"
  | "clientTagAssignment"
>;

const clientInclude = {
  roles: true,
  tags: {
    where: { tag: { deletedAt: null } },
    include: { tag: true },
  },
} satisfies Prisma.ClientInclude;
const clientDetailInclude = {
  ...clientInclude,
  preferences: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.ClientInclude;

export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly database: ClientDatabase = prisma) {}

  create(data: ClientWriteData): Promise<ClientRecord> {
    return this.database.client.create({
      data,
      include: clientInclude,
    });
  }

  async list(options: ClientListOptions) {
    const where = buildClientWhere(options);
    const [records, total] = await Promise.all([
      this.database.client.findMany({
        where,
        include: clientInclude,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.database.client.count({ where }),
    ]);
    return { records, total };
  }

  findById(
    agencyId: string,
    clientId: string,
    permittedAgentId?: string,
  ): Promise<ClientDetailRecord | null> {
    return this.database.client.findFirst({
      where: clientAccessWhere(agencyId, clientId, permittedAgentId),
      include: clientDetailInclude,
    });
  }

  async update(
    agencyId: string,
    clientId: string,
    data: ClientUpdateData,
    permittedAgentId?: string,
  ): Promise<ClientRecord | null> {
    const result = await this.database.client.updateMany({
      where: clientAccessWhere(agencyId, clientId, permittedAgentId),
      data: data as Prisma.ClientUpdateManyMutationInput,
    });
    if (result.count !== 1) return null;
    return this.database.client.findFirst({
      where: clientAccessWhere(agencyId, clientId, permittedAgentId),
      include: clientInclude,
    });
  }

  async softDelete(agencyId: string, clientId: string, deletedAt: Date) {
    const result = await this.database.client.updateMany({
      where: clientAccessWhere(agencyId, clientId),
      data: { deletedAt },
    });
    return result.count === 1;
  }

  async isActiveUserInAgency(userId: string, agencyId: string) {
    return (
      (await this.database.user.count({
        where: { id: userId, agencyId, isActive: true },
      })) === 1
    );
  }

  async assignAgent(
    agencyId: string,
    clientId: string,
    assignedAgentId: string | null,
  ) {
    return this.update(agencyId, clientId, { assignedAgentId });
  }

  async listRoles(
    agencyId: string,
    clientId: string,
    permittedAgentId?: string,
  ) {
    if (!(await this.hasClient(agencyId, clientId, permittedAgentId))) {
      return null;
    }
    return this.database.clientRole.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
    });
  }

  async addRole(
    agencyId: string,
    clientId: string,
    role: ClientRoleType,
    permittedAgentId?: string,
  ): Promise<ClientRole | null> {
    if (!(await this.hasClient(agencyId, clientId, permittedAgentId))) {
      return null;
    }
    return this.database.clientRole.upsert({
      where: { clientId_role: { clientId, role } },
      create: { clientId, role },
      update: {},
    });
  }

  async removeRole(
    agencyId: string,
    clientId: string,
    role: ClientRoleType,
    permittedAgentId?: string,
  ): Promise<boolean | null> {
    if (!(await this.hasClient(agencyId, clientId, permittedAgentId))) {
      return null;
    }
    const result = await this.database.clientRole.deleteMany({
      where: { clientId, role },
    });
    return result.count === 1;
  }

  async listPreferences(
    agencyId: string,
    clientId: string,
    permittedAgentId?: string,
  ) {
    if (!(await this.hasClient(agencyId, clientId, permittedAgentId))) {
      return null;
    }
    return this.database.clientPreference.findMany({
      where: { clientId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async createPreference(
    agencyId: string,
    clientId: string,
    input: CreatePreferenceInput,
    permittedAgentId?: string,
  ): Promise<ClientPreference | null> {
    if (!(await this.hasClient(agencyId, clientId, permittedAgentId))) {
      return null;
    }
    return this.database.clientPreference.create({
      data: {
        ...preferenceData(input),
        clientId,
      } as Prisma.ClientPreferenceUncheckedCreateInput,
    });
  }

  async updatePreference(
    agencyId: string,
    clientId: string,
    preferenceId: string,
    input: UpdatePreferenceInput,
    permittedAgentId?: string,
  ): Promise<ClientPreference | null> {
    if (!(await this.hasClient(agencyId, clientId, permittedAgentId))) {
      return null;
    }
    const result = await this.database.clientPreference.updateMany({
      where: { id: preferenceId, clientId, deletedAt: null },
      data: preferenceData(input),
    });
    return result.count === 1
      ? this.database.clientPreference.findFirst({
          where: { id: preferenceId, clientId, deletedAt: null },
        })
      : null;
  }

  async softDeletePreference(
    agencyId: string,
    clientId: string,
    preferenceId: string,
    deletedAt: Date,
    permittedAgentId?: string,
  ): Promise<boolean | null> {
    if (!(await this.hasClient(agencyId, clientId, permittedAgentId))) {
      return null;
    }
    const result = await this.database.clientPreference.updateMany({
      where: { id: preferenceId, clientId, deletedAt: null },
      data: { deletedAt },
    });
    return result.count === 1;
  }

  async listActivities(
    agencyId: string,
    clientId: string,
    permittedAgentId?: string,
  ): Promise<ClientActivity[] | null> {
    if (!(await this.hasClient(agencyId, clientId, permittedAgentId))) {
      return null;
    }
    return this.database.clientActivity.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createActivity(
    agencyId: string,
    clientId: string,
    createdById: string,
    input: CreateActivityInput,
    permittedAgentId?: string,
  ): Promise<ClientActivity | null> {
    if (!(await this.hasClient(agencyId, clientId, permittedAgentId))) {
      return null;
    }
    return this.database.clientActivity.create({
      data: {
        ...input,
        metadata: input.metadata ?? undefined,
        clientId,
        createdById,
      },
    });
  }

  listTags(agencyId: string): Promise<ClientTag[]> {
    return this.database.clientTag.findMany({
      where: { agencyId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  findTagById(agencyId: string, tagId: string): Promise<ClientTag | null> {
    return this.database.clientTag.findFirst({
      where: { id: tagId, agencyId, deletedAt: null },
    });
  }

  async createTag(agencyId: string, input: CreateClientTagInput) {
    try {
      return await this.database.clientTag.create({
        data: { ...input, agencyId },
      });
    } catch (error) {
      return mapTagError(error);
    }
  }

  async updateTag(
    agencyId: string,
    tagId: string,
    input: UpdateClientTagInput,
  ) {
    try {
      const result = await this.database.clientTag.updateMany({
        where: { id: tagId, agencyId, deletedAt: null },
        data: input,
      });
      return result.count === 1 ? this.findTagById(agencyId, tagId) : null;
    } catch (error) {
      return mapTagError(error);
    }
  }

  async softDeleteTag(agencyId: string, tagId: string, deletedAt: Date) {
    const result = await this.database.clientTag.updateMany({
      where: { id: tagId, agencyId, deletedAt: null },
      data: { deletedAt },
    });
    return result.count === 1;
  }

  async assignTag(
    agencyId: string,
    clientId: string,
    tagId: string,
    permittedAgentId?: string,
  ): Promise<boolean | null> {
    if (
      !(await this.hasClient(agencyId, clientId, permittedAgentId)) ||
      !(await this.findTagById(agencyId, tagId))
    ) {
      return null;
    }
    await this.database.clientTagAssignment.upsert({
      where: { clientId_tagId: { clientId, tagId } },
      create: { clientId, tagId },
      update: {},
    });
    return true;
  }

  async removeTag(
    agencyId: string,
    clientId: string,
    tagId: string,
    permittedAgentId?: string,
  ): Promise<boolean | null> {
    if (!(await this.hasClient(agencyId, clientId, permittedAgentId))) {
      return null;
    }
    const result = await this.database.clientTagAssignment.deleteMany({
      where: { clientId, tagId, tag: { agencyId, deletedAt: null } },
    });
    return result.count === 1;
  }

  private async hasClient(
    agencyId: string,
    clientId: string,
    permittedAgentId?: string,
  ) {
    return (
      (await this.database.client.count({
        where: clientAccessWhere(agencyId, clientId, permittedAgentId),
      })) === 1
    );
  }
}

export const buildClientWhere = (
  options: ClientListOptions,
): Prisma.ClientWhereInput => {
  const and: Prisma.ClientWhereInput[] = [];
  if (options.search) {
    and.push({
      OR: ["fullName", "phone", "secondaryPhone", "whatsapp", "email"].map(
        (field) => ({
          [field]: {
            contains: options.search,
            mode: Prisma.QueryMode.insensitive,
          },
        }),
      ),
    });
  }
  if (options.phone) {
    and.push({
      OR: ["phone", "secondaryPhone", "whatsapp"].map((field) => ({
        [field]: { contains: options.phone },
      })),
    });
  }
  return {
    agencyId: options.agencyId,
    deletedAt: null,
    ...(options.permittedAgentId
      ? { assignedAgentId: options.permittedAgentId }
      : {}),
    ...(and.length ? { AND: and } : {}),
    ...(options.name
      ? {
          fullName: {
            contains: options.name,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {}),
    ...(options.email
      ? {
          email: {
            contains: options.email,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {}),
    ...(options.role ? { roles: { some: { role: options.role } } } : {}),
    ...(options.leadStatus ? { leadStatus: options.leadStatus } : {}),
    ...(options.leadSource ? { leadSource: options.leadSource } : {}),
    ...(options.assignedAgentId
      ? { assignedAgentId: options.assignedAgentId }
      : {}),
    ...(options.tagId
      ? {
          tags: {
            some: {
              tagId: options.tagId,
              tag: { agencyId: options.agencyId, deletedAt: null },
            },
          },
        }
      : {}),
    ...(options.priority ? { priority: options.priority } : {}),
  };
};

const clientAccessWhere = (
  agencyId: string,
  clientId: string,
  permittedAgentId?: string,
): Prisma.ClientWhereInput => ({
  id: clientId,
  agencyId,
  deletedAt: null,
  ...(permittedAgentId ? { assignedAgentId: permittedAgentId } : {}),
});

const preferenceData = (
  input: CreatePreferenceInput | UpdatePreferenceInput,
): Prisma.ClientPreferenceUncheckedUpdateManyInput => ({
  ...input,
  ...(input.minArea !== undefined
    ? {
        minArea:
          input.minArea === null ? null : new Prisma.Decimal(input.minArea),
      }
    : {}),
  ...(input.maxArea !== undefined
    ? {
        maxArea:
          input.maxArea === null ? null : new Prisma.Decimal(input.maxArea),
      }
    : {}),
  ...(input.minBudget !== undefined
    ? {
        minBudget:
          input.minBudget === null ? null : new Prisma.Decimal(input.minBudget),
      }
    : {}),
  ...(input.maxBudget !== undefined
    ? {
        maxBudget:
          input.maxBudget === null ? null : new Prisma.Decimal(input.maxBudget),
      }
    : {}),
});

const mapTagError = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new DuplicateClientTagSlugError();
  }
  throw error;
};
