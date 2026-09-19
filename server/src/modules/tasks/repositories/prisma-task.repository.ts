import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { TaskListOptions, TaskRepository } from "./task.repository.js";

export class PrismaTaskRepository implements TaskRepository {
  async list(options: TaskListOptions) {
    const where: Prisma.TaskWhereInput = {
      agencyId: options.agencyId,
      deletedAt: null,
      ...(options.assignedUserId ? { assignedUserId: options.assignedUserId } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.priority ? { priority: options.priority } : {}),
      ...(options.clientId ? { clientId: options.clientId } : {}),
      ...(options.propertyId ? { propertyId: options.propertyId } : {}),
      ...(options.dealId ? { dealId: options.dealId } : {}),
      ...(options.viewingId ? { viewingId: options.viewingId } : {}),
      ...(options.search ? {
        OR: [
          { title: { contains: options.search, mode: "insensitive" } },
          { description: { contains: options.search, mode: "insensitive" } },
        ],
      } : {}),
    };

    const [records, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      prisma.task.count({ where }),
    ]);
    return { records, total };
  }

  findById(agencyId: string, id: string, permittedUserId?: string) {
    return prisma.task.findFirst({
      where: {
        id,
        agencyId,
        deletedAt: null,
        ...(permittedUserId ? { OR: [{ assignedUserId: permittedUserId }, { createdById: permittedUserId }] } : {}),
      },
    });
  }

  create(data: Prisma.TaskUncheckedCreateInput) {
    return prisma.task.create({ data });
  }

  async update(agencyId: string, id: string, data: Prisma.TaskUpdateManyMutationInput, permittedUserId?: string) {
    const result = await prisma.task.updateMany({
      where: {
        id,
        agencyId,
        deletedAt: null,
        ...(permittedUserId ? { OR: [{ assignedUserId: permittedUserId }, { createdById: permittedUserId }] } : {}),
      },
      data,
    });
    if (result.count !== 1) return null;
    return prisma.task.findFirst({ where: { id, agencyId, deletedAt: null } });
  }

  async softDelete(agencyId: string, id: string, permittedUserId?: string) {
    const result = await prisma.task.updateMany({
      where: {
        id,
        agencyId,
        deletedAt: null,
        ...(permittedUserId ? { OR: [{ assignedUserId: permittedUserId }, { createdById: permittedUserId }] } : {}),
      },
      data: { deletedAt: new Date() },
    });
    return result.count === 1;
  }

  async validateRelations(agencyId: string, input: {
    assignedUserId: string;
    createdById: string;
    clientId?: string | null;
    propertyId?: string | null;
    dealId?: string | null;
    viewingId?: string | null;
  }) {
    const [assignedUser, creator, client, property, deal, viewing] = await Promise.all([
      prisma.user.count({ where: { id: input.assignedUserId, agencyId, isActive: true } }),
      prisma.user.count({ where: { id: input.createdById, agencyId, isActive: true } }),
      input.clientId ? prisma.client.count({ where: { id: input.clientId, agencyId, deletedAt: null } }) : Promise.resolve(1),
      input.propertyId ? prisma.property.count({ where: { id: input.propertyId, agencyId, deletedAt: null } }) : Promise.resolve(1),
      input.dealId ? prisma.deal.count({ where: { id: input.dealId, agencyId, deletedAt: null } }) : Promise.resolve(1),
      input.viewingId ? prisma.viewing.count({ where: { id: input.viewingId, agencyId, deletedAt: null } }) : Promise.resolve(1),
    ]);
    return {
      assignedUser: assignedUser === 1,
      creator: creator === 1,
      client: client === 1,
      property: property === 1,
      deal: deal === 1,
      viewing: viewing === 1,
    };
  }
}
