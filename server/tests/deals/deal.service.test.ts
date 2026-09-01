import { DealStage } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { DealRepository } from "../../src/modules/deals/repositories/deal.repository.js";
import { DealService } from "../../src/modules/deals/services/deal.service.js";
import {
  agencyId,
  agentActor,
  agentId,
  deal,
  dealId,
  input,
  otherAgentId,
  ownerActor,
} from "./deal.fixtures.js";
const mock = () =>
  ({
    validateRelations: vi
      .fn()
      .mockResolvedValue({ client: true, property: true, agent: true }),
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    assign: vi.fn(),
    changeStage: vi.fn(),
    history: vi.fn(),
    listNotes: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
  }) as DealRepository;
describe("DealService", () => {
  it("validates same-agency relations and creates", async () => {
    const r = mock();
    vi.mocked(r.create).mockResolvedValue({
      ...deal,
      client: {} as never,
      property: {} as never,
    });
    await new DealService(r).create(ownerActor, input);
    expect(r.validateRelations).toHaveBeenCalledWith(
      agencyId,
      input.clientId,
      input.propertyId,
      agentId,
    );
  });
  it("rejects agent assignment to another agent", async () => {
    const r = mock();
    await expect(
      new DealService(r).create(agentActor, {
        ...input,
        assignedAgentId: otherAgentId,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(r.create).not.toHaveBeenCalled();
  });
  it("applies repository agent scope and pagination", async () => {
    const r = mock();
    vi.mocked(r.list).mockResolvedValue({ records: [], total: 41 });
    const result = await new DealService(r).list(agentActor, {
      page: 2,
      pageSize: 20,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    expect(r.list).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId, permittedAgentId: agentId }),
    );
    expect(result.pagination.totalPages).toBe(3);
  });
  it("denies unassigned and cross-agency deals with 404", async () => {
    const r = mock();
    vi.mocked(r.findById).mockResolvedValue(null);
    await expect(
      new DealService(r).get(agentActor, dealId),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(r.findById).toHaveBeenCalledWith(agencyId, dealId, agentId);
  });
  it("creates one stage change and rejects no-op transitions", async () => {
    const r = mock();
    vi.mocked(r.findById).mockResolvedValue({
      ...deal,
      client: {} as never,
      property: {} as never,
    });
    vi.mocked(r.changeStage).mockResolvedValue({
      ...deal,
      stage: DealStage.QUALIFIED,
      client: {} as never,
      property: {} as never,
    });
    await new DealService(r).changeStage(agentActor, dealId, {
      stage: DealStage.QUALIFIED,
    });
    expect(r.changeStage).toHaveBeenCalledTimes(1);
    await expect(
      new DealService(r).changeStage(agentActor, dealId, {
        stage: DealStage.NEW_LEAD,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it("keeps notes scoped and manager-only deletion", async () => {
    const r = mock();
    vi.mocked(r.createNote).mockResolvedValue(null);
    await expect(
      new DealService(r).createNote(agentActor, dealId, "note"),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      new DealService(r).remove(agentActor, dealId),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
