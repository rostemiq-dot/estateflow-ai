import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middleware/error-handler.js";
import { createDealRouter } from "../../src/modules/deals/routes/deal.routes.js";
import type { DealServiceContract } from "../../src/modules/deals/services/deal.service.js";
import {
  agentActor,
  dealId,
  input,
  noteId,
  ownerActor,
} from "./deal.fixtures.js";
const service = (): DealServiceContract => ({
  create: vi.fn().mockResolvedValue({}),
  list: vi.fn().mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  }),
  get: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  remove: vi.fn(),
  assign: vi.fn().mockResolvedValue({}),
  changeStage: vi.fn().mockResolvedValue({}),
  history: vi.fn().mockResolvedValue([]),
  listNotes: vi.fn().mockResolvedValue([]),
  createNote: vi.fn().mockResolvedValue({}),
  updateNote: vi.fn().mockResolvedValue({}),
  deleteNote: vi.fn(),
});
const app = (actor = ownerActor) => {
  const s = service(),
    a = express();
  const auth: RequestHandler = (q, _s, n) => {
    q.user = actor;
    n();
  };
  a.use(express.json());
  a.use("/api/deals", createDealRouter(s, auth));
  a.use(errorHandler);
  return { a, s };
};
describe("deal routes", () => {
  it("supports validated CRUD and listing filters", async () => {
    const { a, s } = app();
    expect((await request(a).post("/api/deals").send(input)).status).toBe(201);
    const list = await request(a)
      .get("/api/deals")
      .query({ page: "2", stage: "NEW_LEAD", minAmount: "100" });
    expect(list.status).toBe(200);
    expect(s.list).toHaveBeenCalledWith(
      ownerActor,
      expect.objectContaining({
        page: 2,
        stage: "NEW_LEAD",
        minAmount: "100",
        sortBy: "updatedAt",
      }),
    );
    expect((await request(a).get(`/api/deals/${dealId}`)).status).toBe(200);
  });
  it("supports stage history and scoped notes", async () => {
    const { a, s } = app();
    expect(
      (
        await request(a)
          .patch(`/api/deals/${dealId}/stage`)
          .send({ stage: "WON", closedAt: "2026-07-28T10:00:00Z" })
      ).status,
    ).toBe(200);
    expect(
      (await request(a).get(`/api/deals/${dealId}/stage-history`)).status,
    ).toBe(200);
    expect(
      (
        await request(a)
          .post(`/api/deals/${dealId}/notes`)
          .send({ body: " Follow up " })
      ).status,
    ).toBe(201);
    expect(
      (await request(a).delete(`/api/deals/${dealId}/notes/${noteId}`)).status,
    ).toBe(204);
    expect(s.createNote).toHaveBeenCalledWith(ownerActor, dealId, "Follow up");
  });
  it("enforces manager assignment/delete and validation", async () => {
    const { a, s } = app(agentActor);
    expect(
      (
        await request(a)
          .patch(`/api/deals/${dealId}/assignment`)
          .send({ assignedAgentId: agentActor.id })
      ).status,
    ).toBe(403);
    expect((await request(a).delete(`/api/deals/${dealId}`)).status).toBe(403);
    expect((await request(a).get("/api/deals/bad")).status).toBe(400);
    expect(s.assign).not.toHaveBeenCalled();
  });
  it("rejects invalid close and financial payloads", async () => {
    const { a, s } = app();
    expect(
      (
        await request(a)
          .patch(`/api/deals/${dealId}/stage`)
          .send({ stage: "LOST" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(a)
          .post("/api/deals")
          .send({ ...input, askingPrice: "-1" })
      ).status,
    ).toBe(400);
    expect(s.changeStage).not.toHaveBeenCalled();
  });
});
