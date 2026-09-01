import { ViewingStatus, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  buildViewingWhere,
  hasOverlap,
  PrismaViewingRepository,
} from "../../src/modules/viewings/repositories/prisma-viewing.repository.js";
import {
  agencyId,
  agentId,
  input,
  ownerId,
  viewing,
} from "./viewing.fixtures.js";

describe("viewing repository", () => {
  it("enforces agency, soft delete, and agent scope", () => {
    expect(
      buildViewingWhere({
        agencyId,
        permittedAgentId: agentId,
        page: 1,
        pageSize: 20,
        sortBy: "startAt",
        sortOrder: "asc",
      }),
    ).toEqual({ agencyId, deletedAt: null, assignedAgentId: agentId });
  });

  it("combines interval, search, and relation filters", () => {
    expect(
      buildViewingWhere({
        agencyId,
        page: 1,
        pageSize: 20,
        search: "villa",
        clientId: input.clientId,
        startFrom: "2026-08-01T00:00:00Z",
        startTo: "2026-08-02T00:00:00Z",
        sortBy: "startAt",
        sortOrder: "asc",
      }),
    ).toEqual(
      expect.objectContaining({
        agencyId,
        clientId: input.clientId,
        startAt: expect.any(Object),
        OR: expect.any(Array),
      }),
    );
  });

  it("creates viewing and uniquely linked activities atomically", async () => {
    const tx = activityTransaction();
    const db = transactionDatabase(tx);
    await new PrismaViewingRepository(db).create(agencyId, ownerId, input);
    expect(tx.viewing.create).toHaveBeenCalledTimes(1);
    expect(tx.clientActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: input.clientId,
        viewingId: viewing.id,
        metadata: { viewingId: viewing.id },
      }),
    });
    expect(tx.dealActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dealId: input.dealId,
        viewingId: viewing.id,
      }),
    });
  });

  it("rejects overlapping active schedules", async () => {
    const tx = activityTransaction();
    tx.viewing.count.mockResolvedValue(1);
    await expect(
      new PrismaViewingRepository(transactionDatabase(tx)).create(
        agencyId,
        ownerId,
        input,
      ),
    ).rejects.toHaveProperty("name", "ViewingScheduleConflictError");
    expect(tx.viewing.create).not.toHaveBeenCalled();
  });

  it("validates agency-scoped records and deal/client/property matching", async () => {
    const db = {
      property: { count: vi.fn().mockResolvedValue(1) },
      client: { count: vi.fn().mockResolvedValue(1) },
      deal: { count: vi.fn().mockResolvedValue(1) },
      user: { count: vi.fn().mockResolvedValue(1) },
    } as unknown as ViewingDb;
    const result = await new PrismaViewingRepository(db).validateRelations(
      agencyId,
      input.propertyId,
      input.clientId,
      input.dealId,
      input.assignedAgentId,
      ownerId,
    );
    expect(result).toEqual({
      property: true,
      client: true,
      deal: true,
      agent: true,
      creator: true,
    });
    expect(db.deal.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        agencyId,
        deletedAt: null,
        clientId: input.clientId,
        propertyId: input.propertyId,
      }),
    });
    expect(db.user.count).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "adjacent after",
      new Date("2026-08-01T11:00:00Z"),
      new Date("2026-08-01T12:00:00Z"),
      false,
    ],
    [
      "adjacent before",
      new Date("2026-08-01T09:00:00Z"),
      new Date("2026-08-01T10:00:00Z"),
      false,
    ],
    [
      "overlap at start boundary",
      new Date("2026-08-01T09:30:00Z"),
      new Date("2026-08-01T10:30:00Z"),
      true,
    ],
    [
      "overlap at end boundary",
      new Date("2026-08-01T10:30:00Z"),
      new Date("2026-08-01T11:30:00Z"),
      true,
    ],
  ])(
    "handles %s with half-open intervals",
    async (_name, start, end, result) => {
      expect(await overlapAgainst(viewing, start as Date, end as Date)).toBe(
        result,
      );
    },
  );

  it("excludes the current viewing during update checks", async () => {
    expect(
      await overlapAgainst(viewing, viewing.startAt, viewing.endAt, viewing.id),
    ).toBe(false);
  });

  it.each([
    [{ ...viewing, status: ViewingStatus.CANCELLED }, "cancelled"],
    [{ ...viewing, status: ViewingStatus.NO_SHOW }, "no-show"],
    [{ ...viewing, deletedAt: new Date() }, "soft-deleted"],
  ])("%s viewing does not block scheduling", async (existing) => {
    expect(await overlapAgainst(existing, viewing.startAt, viewing.endAt)).toBe(
      false,
    );
  });

  it.each(["clientActivity", "dealActivity"] as const)(
    "rolls back when %s insertion fails",
    async (failure) => {
      let committed = false;
      const tx = activityTransaction(failure);
      const db = {
        $transaction: vi.fn(async (callback) => {
          const result = await callback(tx);
          committed = true;
          return result;
        }),
      } as unknown as ViewingDb;
      await expect(
        new PrismaViewingRepository(db).create(agencyId, ownerId, input),
      ).rejects.toThrow("activity failed");
      expect(committed).toBe(false);
    },
  );
});

type ViewingDb = Pick<
  PrismaClient,
  "viewing" | "property" | "client" | "deal" | "user" | "$transaction"
>;
const activityTransaction = (failure?: "clientActivity" | "dealActivity") => ({
  viewing: {
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue(viewing),
  },
  clientActivity: {
    create:
      failure === "clientActivity"
        ? vi.fn().mockRejectedValue(new Error("activity failed"))
        : vi.fn().mockResolvedValue({}),
  },
  dealActivity: {
    create:
      failure === "dealActivity"
        ? vi.fn().mockRejectedValue(new Error("activity failed"))
        : vi.fn().mockResolvedValue({}),
  },
});
const transactionDatabase = (
  transaction: ReturnType<typeof activityTransaction>,
) =>
  ({
    $transaction: vi.fn(async (callback) => callback(transaction)),
  }) as unknown as ViewingDb;
const overlapAgainst = (
  existing: typeof viewing,
  requestedStart: Date,
  requestedEnd: Date,
  excludeId?: string,
) => {
  const transaction = {
    viewing: {
      count: vi.fn(({ where }) =>
        Promise.resolve(
          existing.agencyId === where.agencyId &&
            existing.assignedAgentId === where.assignedAgentId &&
            existing.deletedAt === null &&
            [
              ViewingStatus.SCHEDULED,
              ViewingStatus.CONFIRMED,
              ViewingStatus.RESCHEDULED,
            ].includes(existing.status) &&
            existing.startAt < where.startAt.lt &&
            existing.endAt > where.endAt.gt &&
            (!where.id || existing.id !== where.id.not)
            ? 1
            : 0,
        ),
      ),
    },
  };
  return hasOverlap(
    transaction as never,
    agencyId,
    agentId,
    requestedStart,
    requestedEnd,
    excludeId,
  );
};
