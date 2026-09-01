import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  buildDealWhere,
  PrismaDealRepository,
} from "../../src/modules/deals/repositories/prisma-deal.repository.js";
import {
  agencyId,
  agentId,
  deal,
  dealId,
  input,
  ownerId,
} from "./deal.fixtures.js";
describe("deal repository", () => {
  it("enforces agency, soft delete, and agent scope", () => {
    expect(
      buildDealWhere({
        agencyId,
        permittedAgentId: agentId,
        page: 1,
        pageSize: 20,
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
    ).toEqual({ agencyId, deletedAt: null, assignedAgentId: agentId });
  });
  it("combines search and amount filters", () => {
    const where = buildDealWhere({
      agencyId,
      page: 1,
      pageSize: 20,
      search: "villa",
      minAmount: "10",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    expect(where.AND).toHaveLength(2);
  });
  it("creates deal and initial history exactly once in one transaction", async () => {
    const tx = {
      deal: { create: vi.fn().mockResolvedValue(deal) },
      dealStageHistory: { create: vi.fn().mockResolvedValue({}) },
    };
    const db = { $transaction: vi.fn(async (fn) => fn(tx)) } as unknown as Pick<
      PrismaClient,
      | "deal"
      | "client"
      | "property"
      | "user"
      | "dealStageHistory"
      | "dealNote"
      | "$transaction"
    >;
    await new PrismaDealRepository(db).create(agencyId, ownerId, input);
    expect(tx.deal.create).toHaveBeenCalledTimes(1);
    expect(tx.dealStageHistory.create).toHaveBeenCalledTimes(1);
    expect(tx.dealStageHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dealId,
        fromStage: null,
        toStage: "NEW_LEAD",
      }),
    });
  });
  it("scopes notes through parent deal", async () => {
    const db = {
      deal: { count: vi.fn().mockResolvedValue(1) },
      dealNote: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as Pick<
      PrismaClient,
      | "deal"
      | "client"
      | "property"
      | "user"
      | "dealStageHistory"
      | "dealNote"
      | "$transaction"
    >;
    await new PrismaDealRepository(db).listNotes(agencyId, dealId, agentId);
    expect(db.deal.count).toHaveBeenCalledWith({
      where: {
        id: dealId,
        agencyId,
        deletedAt: null,
        assignedAgentId: agentId,
      },
    });
  });
});
