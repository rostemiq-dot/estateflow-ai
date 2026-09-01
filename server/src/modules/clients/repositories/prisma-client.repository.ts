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

  async create(data: ClientWriteData): Promise<ClientRecord> {
    return await this.database.client.create({
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
    const existing = await this.database.client.findFirst({
      where: clientAccessWhere(agencyId, clientId, permittedAgentId),
      select: { id: true },
    });
    if (!existing) return null;

    await this.database.client.update({ where: { id: existing.id }, data });
    return this.database.client.findFirst({
      where: { id: existing.id },
      include: clientInclude,
    });
  }

  async softDelete(agencyId: string, clientId: string, deletedAt: Date): Promise<boolean> {
    const result = await this.database.client.updateMany({
      where: clientAccessWhere(agencyId, clientId),
      data: { deletedAt },
    });
    return result.count > 0;
  }

  async assignAgent(
    agencyId: string,
    clientId: string,
    assignedAgentId: string | null,
  ): Promise<ClientRecord | null> {
    const result = await this.database.client.updateMany({
      where: clientAccessWhere(agencyId, clientId),
      data: { assignedAgentId },
    });
    if (!result.count) return null;
    return this.database.client.findFirst({
      where: { id: clientId },
      include: clientInclude,
    });
  }

  async isActiveUserInAgency(userId: string, agencyId: string): Promise<boolean> {
    const user = await this.database.user.findFirst({
      where: { id: userId, agencyId, isActive: true },
      select: { id: true },
    });
    return user !== null;
  }

  listRoles(agencyId: string, clientId: string, permittedAgentId?: string) {
    return this.database.clientRole.findMany({
      where: { client: clientAccessWhere(agencyId, clientId, permittedAgentId) },
    });
  }

  async addRole(agencyId: string, clientId: string, role: ClientRoleType, permittedAgentId?: string) {
    const client = await this.database.client.findFirst({
      where: clientAccessWhere(agencyId, clientId, permittedAgentId),
      select: { id: true },
    });
    if (!client) return null;
    return this.database.clientRole.upsert({
      where: { clientId_role: { clientId, role } },
      create: { clientId, role },
      update: {},
    });
  }

  async removeRole(agencyId: string, clientId: string, role: ClientRoleType, permittedAgentId?: string) {
    const client = await this.database.client.findFirst({
      where: clientAccessWhere(agencyId, clientId, permittedAgentId),
      select: { id: true },
    });
    if (!client) return null;
    const result = await this.database.clientRole.deleteMany({ where: { clientId, role } });
    return result.count > 0;
  }

  listPreferences(agencyId: string, clientId: string, permittedAgentId?: string) {
    return this.database.clientPreference.findMany({
      where: { client: clientAccessWhere(agencyId, clientId, permittedAgentId), deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async createPreference(agencyId: string, clientId: string, input: CreatePreferenceInput, permittedAgentId?: string) {
    const client = await this.database.client.findFirst({
      where: clientAccessWhere(agencyId, clientId, permittedAgentId),
      select: { id: true },
    });
    if (!client) return null;
    const { minArea, maxArea, minBudget, maxBudget, ...rest } = input;
    return this.database.clientPreference.create({
      data: {
        ...rest,
        clientId,
        minArea: minArea == null ? minArea : new Prisma.Decimal(minArea),
        maxArea: maxArea == null ? maxArea : new Prisma.Decimal(maxArea),
        minBudget: minBudget == null ? minBudget : new Prisma.Decimal(minBudget),
        maxBudget: maxBudget == null ? maxBudget : new Prisma.Decimal(maxBudget),
      },
    });
  }

  async updatePreference(agencyId: string, clientId: string, preferenceId: string, input: UpdatePreferenceInput, permittedAgentId?: string) {
    const preference = await this.database.clientPreference.findFirst({
      where: { id: preferenceId, client: clientAccessWhere(agencyId, clientId, permittedAgentId), deletedAt: null },
    });
    if (!preference) return null;
    const { minArea, maxArea, minBudget, maxBudget, ...rest } = input;
    return this.database.clientPreference.update({
      where: { id: preferenceId },
      data: {
        ...rest,
        ...(minArea !== undefined ? { minArea: minArea === null ? null : new Prisma.Decimal(minArea) } : {}),
        ...(maxArea !== undefined ? { maxArea: maxArea === null ? null : new Prisma.Decimal(maxArea) } : {}),
        ...(minBudget !== undefined ? { minBudget: minBudget === null ? null : new Prisma.Decimal(minBudget) } : {}),
        ...(maxBudget !== undefined ? { maxBudget: maxBudget === null ? null : new Prisma.Decimal(maxBudget) } : {}),
      },
    });
  }

  async deletePreference(agencyId: string, clientId: string, preferenceId: string, deletedAt: Date, permittedAgentId?: string) {
    const result = await this.database.clientPreference.updateMany({
      where: { id: preferenceId, client: clientAccessWhere(agencyId, clientId, permittedAgentId), deletedAt: null },
      data: { deletedAt },
    });
    return result.count > 0;
  }

  listActivities(agencyId: string, clientId: string, permittedAgentId?: string) {
    return this.database.clientActivity.findMany({
      where: { client: clientAccessWhere(agencyId, clientId, permittedAgentId) },
      orderBy: { createdAt: "desc" },
    });
  }

  async createActivity(agencyId: string, clientId: string, actorId: string, input: CreateActivityInput, permittedAgentId?: string) {
    const client = await this.database.client.findFirst({
      where: clientAccessWhere(agencyId, clientId, permittedAgentId),
      select: { id: true },
    });
    if (!client) return null;
    return this.database.clientActivity.create({
      data: { ...input, clientId, createdById: actorId },
    });
  }

  listTags(agencyId: string) {
    return this.database.clientTag.findMany({ where: { agencyId, deletedAt: null }, orderBy: { name: "asc" } });
  }

  async createTag(agencyId: string, input: CreateClientTagInput) {
    try {
      return await this.database.clientTag.create({ data: { ...input, agencyId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new DuplicateClientTagSlugError();
      }
      throw error;
    }
  }

  async updateTag(agencyId: string, tagId: string, input: UpdateClientTagInput) {
    try {
      return await this.database.clientTag.updateMany({ where: { id: tagId, agencyId, deletedAt: null }, data: input });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new DuplicateClientTagSlugError();
      }
      throw error;
    }
  }

  async deleteTag(agencyId: string, tagId: string, deletedAt: Date) {
    const result = await this.database.clientTag.updateMany({ where: { id: tagId, agencyId, deletedAt: null }, data: { deletedAt } });
    return result.count > 0;
  }
}

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

const buildClientWhere = (options: ClientListOptions): Prisma.ClientWhereInput => ({
  agencyId: options.agencyId,
  deletedAt: null,
  ...(options.permittedAgentId ? { assignedAgentId: options.permittedAgentId } : {}),
  ...(options.assignedAgentId ? { assignedAgentId: options.assignedAgentId } : {}),
  ...(options.search
    ? {
        OR: [
          { firstName: { contains: options.search, mode: "insensitive" } },
          { lastName: { contains: options.search, mode: "insensitive" } },
          { fullName: { contains: options.search, mode: "insensitive" } },
          { email: { contains: options.search, mode: "insensitive" } },
          { phone: { contains: options.search, mode: "insensitive" } },
        ],
      }
    : {}),
  ...(options.name ? { fullName: { contains: options.name, mode: "insensitive" } } : {}),
  ...(options.phone ? { phone: { contains: options.phone } } : {}),
  ...(options.email ? { email: { contains: options.email, mode: "insensitive" } } : {}),
  ...(options.role ? { roles: { some: { role: options.role } } } : {}),
  ...(options.leadStatus ? { leadStatus: options.leadStatus } : {}),
  ...(options.leadSource ? { leadSource: options.leadSource } : {}),
  ...(options.priority ? { priority: options.priority } : {}),
  ...(options.tagId ? { tags: { some: { tagId: options.tagId } } } : {}),
});
