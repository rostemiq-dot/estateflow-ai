import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middleware/error-handler.js";
import { createViewingRouter } from "../../src/modules/viewings/routes/viewing.routes.js";
import type { ViewingServiceContract } from "../../src/modules/viewings/services/viewing.service.js";
import {
  agentActor,
  input,
  ownerActor,
  viewingId,
} from "./viewing.fixtures.js";

const service = (): ViewingServiceContract => ({
  create: vi.fn().mockResolvedValue({}),
  list: vi.fn().mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  }),
  calendar: vi.fn().mockResolvedValue([]),
  get: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  remove: vi.fn(),
});
const app = (actor = ownerActor) => {
  const viewingService = service();
  const api = express();
  const authenticate: RequestHandler = (req, _res, next) => {
    req.user = actor;
    next();
  };
  api.use(express.json());
  api.use("/api/viewings", createViewingRouter(viewingService, authenticate));
  api.use(errorHandler);
  return { api, viewingService };
};

describe("viewing routes", () => {
  it("supports validated CRUD and listing filters", async () => {
    const { api, viewingService } = app();
    expect((await request(api).post("/api/viewings").send(input)).status).toBe(
      201,
    );
    const list = await request(api)
      .get("/api/viewings")
      .query({ page: "2", status: "CONFIRMED", search: "villa" });
    expect(list.status).toBe(200);
    expect(viewingService.list).toHaveBeenCalledWith(
      ownerActor,
      expect.objectContaining({
        page: 2,
        status: "CONFIRMED",
        search: "villa",
      }),
    );
    expect((await request(api).get(`/api/viewings/${viewingId}`)).status).toBe(
      200,
    );
    expect(
      (
        await request(api)
          .patch(`/api/viewings/${viewingId}`)
          .send({ title: "Updated tour" })
      ).status,
    ).toBe(200);
    expect(
      (await request(api).delete(`/api/viewings/${viewingId}`)).status,
    ).toBe(204);
  });

  it("exposes the calendar route before the id route", async () => {
    const { api, viewingService } = app();
    const response = await request(api).get("/api/viewings/calendar").query({
      startAt: "2026-08-01T00:00:00Z",
      endAt: "2026-08-02T00:00:00Z",
    });
    expect(response.status).toBe(200);
    expect(viewingService.calendar).toHaveBeenCalledWith(
      ownerActor,
      expect.objectContaining({
        startAt: "2026-08-01T00:00:00Z",
        endAt: "2026-08-02T00:00:00Z",
      }),
    );
    expect(viewingService.get).not.toHaveBeenCalled();
  });

  it("enforces manager-only deletion", async () => {
    const { api, viewingService } = app(agentActor);
    expect(
      (await request(api).delete(`/api/viewings/${viewingId}`)).status,
    ).toBe(403);
    expect(viewingService.remove).not.toHaveBeenCalled();
  });

  it("rejects invalid schedules, status rules, and identifiers", async () => {
    const { api, viewingService } = app();
    expect(
      (
        await request(api)
          .post("/api/viewings")
          .send({ ...input, startAt: input.endAt })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(api)
          .patch(`/api/viewings/${viewingId}`)
          .send({ status: "INVALID" })
      ).status,
    ).toBe(400);
    expect((await request(api).get("/api/viewings/not-a-uuid")).status).toBe(
      400,
    );
    expect(viewingService.create).not.toHaveBeenCalled();
  });
});
