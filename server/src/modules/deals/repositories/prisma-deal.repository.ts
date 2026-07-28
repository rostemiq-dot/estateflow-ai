import {
  DealStage,
  DealStatus,
  Prisma,
  type Deal,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { DealListOptions, DealRecord } from "../types/deal.types.js";
import type {
  CreateDealInput,
  StageChangeInput,
  UpdateDealInput,
} from "../validators/deal.validators.js";
import {
  ConcurrentDealUpdateError,
  type DealRepository,
} from "./deal.repository.js";

type Db = Pick<
  PrismaClient,
  | "deal"
  | "client"
  | "property"
  | "user"
  | "dealStageHistory"
  | "dealNote"
  | "$transaction"
>;
const include = { client: true, property: true } satisfies Prisma.DealInclude;
export class PrismaDealRepository implements DealRepository {
  constructor(private readonly db: Db = prisma) {}
  async validateRelations(
    agencyId: string,
    clientId: string,
    propertyId: string,
    agentId: string,
  ) {
    const [client, property, agent] = await Promise.all([
      this.db.client.count({
        where: { id: clientId, agencyId, deletedAt: null },
      }),
      this.db.property.count({
        where: { id: propertyId, agencyId, deletedAt: null },
      }),
      this.db.user.count({ where: { id: agentId, agencyId, isActive: true } }),
    ]);
    return {
      client: client === 1,
      property: property === 1,
      agent: agent === 1,
    };
  }
  create(
    agencyId: string,
    createdById: string,
    input: CreateDealInput,
  ): Promise<DealRecord> {
    return this.db.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: dealData(agencyId, createdById, input),
        include,
      });
      await tx.dealStageHistory.create({
        data: {
          dealId: deal.id,
          fromStage: null,
          toStage: deal.stage,
          changedById: createdById,
          note: "Deal created",
        },
      });
      return deal;
    });
  }
  async list(options: DealListOptions) {
    const where = buildDealWhere(options);
    const [records, total] = await Promise.all([
      this.db.deal.findMany({
        where,
        include,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.db.deal.count({ where }),
    ]);
    return { records, total };
  }
  findById(
    agencyId: string,
    dealId: string,
    permittedAgentId?: string,
  ): Promise<DealRecord | null> {
    return this.db.deal.findFirst({
      where: access(agencyId, dealId, permittedAgentId),
      include,
    });
  }
  async update(
    agencyId: string,
    dealId: string,
    input: UpdateDealInput,
    permittedAgentId?: string,
  ) {
    const result = await this.db.deal.updateMany({
      where: access(agencyId, dealId, permittedAgentId),
      data: updateData(input),
    });
    return result.count === 1
      ? this.findById(agencyId, dealId, permittedAgentId)
      : null;
  }
  async softDelete(agencyId: string, dealId: string, deletedAt: Date) {
    const result = await this.db.deal.updateMany({
      where: access(agencyId, dealId),
      data: { deletedAt },
    });
    return result.count === 1;
  }
  async assign(agencyId: string, dealId: string, agentId: string) {
    const result = await this.db.deal.updateMany({
      where: access(agencyId, dealId),
      data: { assignedAgentId: agentId },
    });
    return result.count === 1 ? this.findById(agencyId, dealId) : null;
  }
  changeStage(
    agencyId: string,
    deal: Deal,
    changedById: string,
    input: StageChangeInput,
    permittedAgentId?: string,
  ): Promise<DealRecord | null> {
    return this.db.$transaction(async (tx) => {
      const status =
        input.stage === DealStage.WON
          ? DealStatus.WON
          : input.stage === DealStage.LOST
            ? DealStatus.LOST
            : DealStatus.OPEN;
      const result = await tx.deal.updateMany({
        where: {
          ...access(agencyId, deal.id, permittedAgentId),
          stage: deal.stage,
          updatedAt: deal.updatedAt,
        },
        data: {
          stage: input.stage,
          status,
          closedAt: input.closedAt ? new Date(input.closedAt) : null,
          lostReason: input.stage === DealStage.LOST ? input.lostReason : null,
        },
      });
      if (result.count !== 1) throw new ConcurrentDealUpdateError();
      await tx.dealStageHistory.create({
        data: {
          dealId: deal.id,
          fromStage: deal.stage,
          toStage: input.stage,
          changedById,
          note: input.note,
        },
      });
      return tx.deal.findFirst({
        where: access(agencyId, deal.id, permittedAgentId),
        include,
      });
    });
  }
  async history(agencyId: string, dealId: string, permittedAgentId?: string) {
    if (!(await this.exists(agencyId, dealId, permittedAgentId))) return null;
    return this.db.dealStageHistory.findMany({
      where: { dealId },
      orderBy: { createdAt: "asc" },
    });
  }
  async listNotes(agencyId: string, dealId: string, permittedAgentId?: string) {
    if (!(await this.exists(agencyId, dealId, permittedAgentId))) return null;
    return this.db.dealNote.findMany({
      where: { dealId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }
  async createNote(
    agencyId: string,
    dealId: string,
    createdById: string,
    body: string,
    permittedAgentId?: string,
  ) {
    if (!(await this.exists(agencyId, dealId, permittedAgentId))) return null;
    return this.db.dealNote.create({ data: { dealId, createdById, body } });
  }
  async updateNote(
    agencyId: string,
    dealId: string,
    noteId: string,
    body: string,
    permittedAgentId?: string,
  ) {
    if (!(await this.exists(agencyId, dealId, permittedAgentId))) return null;
    const result = await this.db.dealNote.updateMany({
      where: { id: noteId, dealId, deletedAt: null },
      data: { body },
    });
    return result.count === 1
      ? this.db.dealNote.findFirst({
          where: { id: noteId, dealId, deletedAt: null },
        })
      : null;
  }
  async deleteNote(
    agencyId: string,
    dealId: string,
    noteId: string,
    deletedAt: Date,
    permittedAgentId?: string,
  ) {
    if (!(await this.exists(agencyId, dealId, permittedAgentId))) return null;
    const result = await this.db.dealNote.updateMany({
      where: { id: noteId, dealId, deletedAt: null },
      data: { deletedAt },
    });
    return result.count === 1;
  }
  private async exists(
    agencyId: string,
    dealId: string,
    permittedAgentId?: string,
  ) {
    return (
      (await this.db.deal.count({
        where: access(agencyId, dealId, permittedAgentId),
      })) === 1
    );
  }
}

export const buildDealWhere = (o: DealListOptions): Prisma.DealWhereInput => ({
  agencyId: o.agencyId,
  deletedAt: null,
  ...(o.permittedAgentId ? { assignedAgentId: o.permittedAgentId } : {}),
  ...(o.search || o.minAmount || o.maxAmount
    ? {
        AND: [
          ...(o.search
            ? [
                {
                  OR: [
                    {
                      title: {
                        contains: o.search,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                    {
                      client: {
                        fullName: {
                          contains: o.search,
                          mode: Prisma.QueryMode.insensitive,
                        },
                      },
                    },
                    { client: { phone: { contains: o.search } } },
                    {
                      property: {
                        title: {
                          contains: o.search,
                          mode: Prisma.QueryMode.insensitive,
                        },
                      },
                    },
                    {
                      property: {
                        address: {
                          contains: o.search,
                          mode: Prisma.QueryMode.insensitive,
                        },
                      },
                    },
                  ],
                },
              ]
            : []),
          ...(o.minAmount || o.maxAmount
            ? [
                {
                  OR: ["askingPrice", "offerAmount", "agreedAmount"].map(
                    (field) => ({
                      [field]: {
                        ...(o.minAmount
                          ? { gte: new Prisma.Decimal(o.minAmount) }
                          : {}),
                        ...(o.maxAmount
                          ? { lte: new Prisma.Decimal(o.maxAmount) }
                          : {}),
                      },
                    }),
                  ),
                },
              ]
            : []),
        ],
      }
    : {}),
  ...(o.stage ? { stage: o.stage } : {}),
  ...(o.status ? { status: o.status } : {}),
  ...(o.dealType ? { dealType: o.dealType } : {}),
  ...(o.assignedAgentId ? { assignedAgentId: o.assignedAgentId } : {}),
  ...(o.clientId ? { clientId: o.clientId } : {}),
  ...(o.propertyId ? { propertyId: o.propertyId } : {}),
  ...(o.currency ? { currency: o.currency } : {}),
  ...(o.expectedCloseFrom || o.expectedCloseTo
    ? {
        expectedCloseAt: {
          ...(o.expectedCloseFrom
            ? { gte: new Date(o.expectedCloseFrom) }
            : {}),
          ...(o.expectedCloseTo ? { lte: new Date(o.expectedCloseTo) } : {}),
        },
      }
    : {}),
  ...(o.createdFrom || o.createdTo
    ? {
        createdAt: {
          ...(o.createdFrom ? { gte: new Date(o.createdFrom) } : {}),
          ...(o.createdTo ? { lte: new Date(o.createdTo) } : {}),
        },
      }
    : {}),
});
const access = (
  agencyId: string,
  id: string,
  agent?: string,
): Prisma.DealWhereInput => ({
  id,
  agencyId,
  deletedAt: null,
  ...(agent ? { assignedAgentId: agent } : {}),
});
const decimal = (v: string | null | undefined) =>
  v == null ? v : new Prisma.Decimal(v);
const dealData = (
  agencyId: string,
  createdById: string,
  i: CreateDealInput,
): Prisma.DealUncheckedCreateInput => ({
  ...i,
  agencyId,
  createdById,
  askingPrice: decimal(i.askingPrice),
  offerAmount: decimal(i.offerAmount),
  agreedAmount: decimal(i.agreedAmount),
  expectedCommission: decimal(i.expectedCommission),
  expectedCloseAt: i.expectedCloseAt
    ? new Date(i.expectedCloseAt)
    : i.expectedCloseAt,
  closedAt: i.closedAt ? new Date(i.closedAt) : i.closedAt,
});
const updateData = (
  i: UpdateDealInput,
): Prisma.DealUpdateManyMutationInput => ({
  ...i,
  askingPrice: decimal(i.askingPrice),
  offerAmount: decimal(i.offerAmount),
  agreedAmount: decimal(i.agreedAmount),
  expectedCommission: decimal(i.expectedCommission),
  expectedCloseAt: i.expectedCloseAt
    ? new Date(i.expectedCloseAt)
    : i.expectedCloseAt,
});
