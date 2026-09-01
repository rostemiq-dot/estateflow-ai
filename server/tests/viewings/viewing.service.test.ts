import { ViewingStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  ViewingScheduleConflictError,
  type ViewingRepository,
} from "../../src/modules/viewings/repositories/viewing.repository.js";
import { ViewingService } from "../../src/modules/viewings/services/viewing.service.js";
import {
  allowedViewingTransitions,
  assertViewingTransition,
} from "../../src/modules/viewings/services/viewing-lifecycle.js";
import {
  agencyId,
  agentActor,
  agentId,
  input,
  otherAgentId,
  ownerActor,
  viewing,
  viewingId,
} from "./viewing.fixtures.js";

const record = { ...viewing, client: {}, property: {}, deal: {} } as never;
const mock = () =>
  ({
    validateRelations: vi.fn().mockResolvedValue({
      property: true,
      client: true,
      deal: true,
      agent: true,
      creator: true,
    }),
    create: vi.fn(),
    list: vi.fn(),
    calendar: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  }) as ViewingRepository;

describe("ViewingService", () => {
  it("validates same-agency relations and creates", async () => {
    const repository = mock();
    vi.mocked(repository.create).mockResolvedValue(record);
    await new ViewingService(repository).create(ownerActor, input);
    expect(repository.validateRelations).toHaveBeenCalledWith(
      agencyId,
      input.propertyId,
      input.clientId,
      input.dealId,
      input.assignedAgentId,
      ownerActor.id,
    );
  });

  it("prevents agents assigning another agent", async () => {
    const repository = mock();
    await expect(
      new ViewingService(repository).create(agentActor, {
        ...input,
        assignedAgentId: otherAgentId,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("scopes agent lists and calendar results", async () => {
    const repository = mock();
    vi.mocked(repository.list).mockResolvedValue({ records: [], total: 21 });
    vi.mocked(repository.calendar).mockResolvedValue([]);
    const service = new ViewingService(repository);
    const result = await service.list(agentActor, {
      page: 2,
      pageSize: 20,
      sortBy: "startAt",
      sortOrder: "asc",
    });
    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId, permittedAgentId: agentId }),
    );
    expect(result.pagination.totalPages).toBe(2);
    await service.calendar(agentActor, {
      startAt: "2026-08-01T00:00:00Z",
      endAt: "2026-08-02T00:00:00Z",
    });
    expect(repository.calendar).toHaveBeenCalledWith(
      agencyId,
      expect.any(Date),
      expect.any(Date),
      agentId,
    );
  });

  it("enforces status rules against merged update state", async () => {
    const repository = mock();
    vi.mocked(repository.findById).mockResolvedValue(record);
    await expect(
      new ViewingService(repository).update(agentActor, viewingId, {
        status: ViewingStatus.COMPLETED,
        outcome: null,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      new ViewingService(repository).update(agentActor, viewingId, {
        status: ViewingStatus.CANCELLED,
        cancellationReason: null,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("allows every declared lifecycle transition", () => {
    for (const [from, targets] of Object.entries(allowedViewingTransitions)) {
      for (const to of targets) {
        expect(() =>
          assertViewingTransition(from as ViewingStatus, to),
        ).not.toThrow();
      }
    }
  });

  it("accepts idempotent same-status updates for every status", () => {
    for (const status of Object.values(ViewingStatus)) {
      expect(() => assertViewingTransition(status, status)).not.toThrow();
    }
  });

  it("rejects every undeclared lifecycle transition", () => {
    for (const from of Object.values(ViewingStatus)) {
      for (const to of Object.values(ViewingStatus)) {
        if (from !== to && !allowedViewingTransitions[from].includes(to)) {
          expect(() => assertViewingTransition(from, to)).toThrowError(
            expect.objectContaining({ statusCode: 409 }),
          );
        }
      }
    }
  });

  it("treats NO_SHOW as terminal", async () => {
    const repository = mock();
    vi.mocked(repository.findById).mockResolvedValue({
      ...record,
      status: ViewingStatus.NO_SHOW,
    });
    await expect(
      new ViewingService(repository).update(agentActor, viewingId, {
        status: ViewingStatus.SCHEDULED,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("validates partial dates against stored values", async () => {
    const repository = mock();
    vi.mocked(repository.findById).mockResolvedValue(record);
    vi.mocked(repository.update).mockResolvedValue(record);
    const service = new ViewingService(repository);
    await expect(
      service.update(agentActor, viewingId, {
        startAt: "2026-08-01T11:00:00Z",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.update(agentActor, viewingId, {
        endAt: "2026-08-01T10:00:00Z",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it.each([
    ["startAt", { startAt: "2026-08-01T09:30:00Z" }],
    ["endAt", { endAt: "2026-08-01T11:30:00Z" }],
  ] as const)("accepts a valid partial %s update", async (_field, change) => {
    const repository = mock();
    vi.mocked(repository.findById).mockResolvedValue(record);
    vi.mocked(repository.update).mockResolvedValue(record);
    await new ViewingService(repository).update(agentActor, viewingId, change);
    expect(repository.update).toHaveBeenCalledWith(
      agencyId,
      record,
      change,
      agentId,
    );
  });

  it("safely updates status and schedule together", async () => {
    const repository = mock();
    const updated = {
      ...record,
      status: ViewingStatus.RESCHEDULED,
      startAt: new Date("2026-08-01T12:00:00Z"),
      endAt: new Date("2026-08-01T13:00:00Z"),
    };
    vi.mocked(repository.findById).mockResolvedValue(record);
    vi.mocked(repository.update).mockResolvedValue(updated);
    await new ViewingService(repository).update(agentActor, viewingId, {
      status: ViewingStatus.RESCHEDULED,
      startAt: "2026-08-01T12:00:00Z",
      endAt: "2026-08-01T13:00:00Z",
    });
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it.each(["property", "client", "deal", "agent", "creator"] as const)(
    "rejects cross-agency or mismatched %s relations",
    async (relation) => {
      const repository = mock();
      vi.mocked(repository.validateRelations).mockResolvedValue({
        property: true,
        client: true,
        deal: true,
        agent: true,
        creator: true,
        [relation]: false,
      });
      await expect(
        new ViewingService(repository).create(ownerActor, input),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  it("maps schedule conflicts and enforces manager deletion", async () => {
    const repository = mock();
    vi.mocked(repository.create).mockRejectedValue(
      new ViewingScheduleConflictError(),
    );
    await expect(
      new ViewingService(repository).create(ownerActor, input),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      new ViewingService(repository).remove(agentActor, viewingId),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
