import {
  ClientActivityType,
  DealActivityType,
  Prisma,
  ViewingStatus,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type {
  ViewingListOptions,
  ViewingRecord,
} from "../types/viewing.types.js";
import type {
  CreateViewingInput,
  UpdateViewingInput,
} from "../validators/viewing.validators.js";
import {
  ViewingScheduleConflictError,
  type ViewingRepository,
} from "./viewing.repository.js";

type Db = Pick<
  PrismaClient,
  "viewing" | "property" | "client" | "deal" | "user" | "$transaction"
>;
const include = {
  client: true,
  property: true,
  deal: true,
} satisfies Prisma.ViewingInclude;
const activeStatuses: ViewingStatus[] = [
  ViewingStatus.SCHEDULED,
  ViewingStatus.CONFIRMED,
  ViewingStatus.RESCHEDULED,
];

export class PrismaViewingRepository implements ViewingRepository {
  constructor(private readonly db: Db = prisma) {}

  async validateRelations(
    agencyId: string,
    propertyId: string,
    clientId: string,
    dealId: string | null,
    agentId: string,
    creatorId: string,
  ) {
    const [property, client, deal, agent, creator] = await Promise.all([
      this.db.property.count({
        where: { id: propertyId, agencyId, deletedAt: null },
      }),
      this.db.client.count({
        where: { id: clientId, agencyId, deletedAt: null },
      }),
      dealId === null
        ? Promise.resolve(1)
        : this.db.deal.count({
            where: {
              id: dealId,
              agencyId,
              clientId,
              propertyId,
              deletedAt: null,
            },
          }),
      this.db.user.count({
        where: { id: agentId, agencyId, isActive: true },
      }),
      this.db.user.count({
        where: { id: creatorId, agencyId, isActive: true },
      }),
    ]);
    return {
      property: property === 1,
      client: client === 1,
      deal: deal === 1,
      agent: agent === 1,
      creator: creator === 1,
    };
  }

  async create(
    agencyId: string,
    createdById: string,
    input: CreateViewingInput,
  ): Promise<ViewingRecord> {
    try {
      return await this.db.$transaction(
        async (tx) => {
          if (
            await hasOverlap(
              tx,
              agencyId,
              input.assignedAgentId,
              new Date(input.startAt),
              new Date(input.endAt),
            )
          ) {
            throw new ViewingScheduleConflictError();
          }
          const viewing = await tx.viewing.create({
            data: createData(agencyId, createdById, input),
            include,
          });
          const description = `Viewing scheduled: ${viewing.title}`;
          await tx.clientActivity.create({
            data: {
              clientId: input.clientId,
              viewingId: viewing.id,
              activityType: ClientActivityType.VIEWING,
              description,
              createdById,
              metadata: { viewingId: viewing.id },
            },
          });
          if (input.dealId) {
            await tx.dealActivity.create({
              data: {
                dealId: input.dealId,
                viewingId: viewing.id,
                activityType: DealActivityType.VIEWING_SCHEDULED,
                description,
                createdById,
              },
            });
          }
          return viewing;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      return mapTransactionError(error);
    }
  }

  async list(options: ViewingListOptions) {
    const where = buildViewingWhere(options);
    const [records, total] = await Promise.all([
      this.db.viewing.findMany({
        where,
        include,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.db.viewing.count({ where }),
    ]);
    return { records, total };
  }

  calendar(
    agencyId: string,
    startAt: Date,
    endAt: Date,
    permittedAgentId?: string,
  ) {
    return this.db.viewing.findMany({
      where: {
        agencyId,
        deletedAt: null,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(permittedAgentId ? { assignedAgentId: permittedAgentId } : {}),
      },
      include,
      orderBy: { startAt: "asc" },
    });
  }

  findById(agencyId: string, viewingId: string, permittedAgentId?: string) {
    return this.db.viewing.findFirst({
      where: access(agencyId, viewingId, permittedAgentId),
      include,
    });
  }

  async update(
    agencyId: string,
    current: ViewingRecord,
    input: UpdateViewingInput,
    permittedAgentId?: string,
  ): Promise<ViewingRecord | null> {
    const assignedAgentId = input.assignedAgentId ?? current.assignedAgentId;
    const startAt = input.startAt ? new Date(input.startAt) : current.startAt;
    const endAt = input.endAt ? new Date(input.endAt) : current.endAt;
    const status = input.status ?? current.status;
    try {
      return await this.db.$transaction(
        async (tx) => {
          if (
            activeStatuses.includes(status) &&
            (await hasOverlap(
              tx,
              agencyId,
              assignedAgentId,
              startAt,
              endAt,
              current.id,
            ))
          ) {
            throw new ViewingScheduleConflictError();
          }
          const result = await tx.viewing.updateMany({
            where: {
              ...access(agencyId, current.id, permittedAgentId),
              updatedAt: current.updatedAt,
            },
            data: updateData(input),
          });
          if (result.count !== 1) return null;
          return tx.viewing.findFirst({
            where: access(agencyId, current.id, permittedAgentId),
            include,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      return mapTransactionError(error);
    }
  }

  async softDelete(agencyId: string, viewingId: string, deletedAt: Date) {
    const result = await this.db.viewing.updateMany({
      where: access(agencyId, viewingId),
      data: { deletedAt },
    });
    return result.count === 1;
  }
}

export const buildViewingWhere = (
  options: ViewingListOptions,
): Prisma.ViewingWhereInput => ({
  agencyId: options.agencyId,
  deletedAt: null,
  ...(options.permittedAgentId
    ? { assignedAgentId: options.permittedAgentId }
    : {}),
  ...(options.search
    ? {
        OR: [
          { title: { contains: options.search, mode: "insensitive" } },
          { location: { contains: options.search, mode: "insensitive" } },
          {
            client: {
              fullName: { contains: options.search, mode: "insensitive" },
            },
          },
          {
            property: {
              title: { contains: options.search, mode: "insensitive" },
            },
          },
        ],
      }
    : {}),
  ...(options.status ? { status: options.status } : {}),
  ...(options.assignedAgentId
    ? { assignedAgentId: options.assignedAgentId }
    : {}),
  ...(options.clientId ? { clientId: options.clientId } : {}),
  ...(options.propertyId ? { propertyId: options.propertyId } : {}),
  ...(options.dealId ? { dealId: options.dealId } : {}),
  ...(options.startFrom || options.startTo
    ? {
        startAt: {
          ...(options.startFrom ? { gte: new Date(options.startFrom) } : {}),
          ...(options.startTo ? { lte: new Date(options.startTo) } : {}),
        },
      }
    : {}),
});

export const hasOverlap = (
  tx: Prisma.TransactionClient,
  agencyId: string,
  assignedAgentId: string,
  startAt: Date,
  endAt: Date,
  excludeId?: string,
) =>
  tx.viewing
    .count({
      where: {
        agencyId,
        assignedAgentId,
        deletedAt: null,
        status: { in: activeStatuses },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })
    .then((count) => count > 0);
const access = (
  agencyId: string,
  id: string,
  agentId?: string,
): Prisma.ViewingWhereInput => ({
  id,
  agencyId,
  deletedAt: null,
  ...(agentId ? { assignedAgentId: agentId } : {}),
});
const createData = (
  agencyId: string,
  createdById: string,
  input: CreateViewingInput,
): Prisma.ViewingUncheckedCreateInput => ({
  ...input,
  dealId: input.dealId ?? null,
  agencyId,
  createdById,
  startAt: new Date(input.startAt),
  endAt: new Date(input.endAt),
});
const updateData = (
  input: UpdateViewingInput,
): Prisma.ViewingUpdateManyMutationInput => ({
  ...input,
  ...(input.startAt ? { startAt: new Date(input.startAt) } : {}),
  ...(input.endAt ? { endAt: new Date(input.endAt) } : {}),
});
const mapTransactionError = (error: unknown): never => {
  if (
    error instanceof ViewingScheduleConflictError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034")
  ) {
    throw new ViewingScheduleConflictError();
  }
  throw error;
};
