import { ClientRoleType } from "@prisma/client";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middleware/error-handler.js";
import type { AuthenticatedUser } from "../../src/modules/auth/types/auth.types.js";
import {
  createClientRouter,
  createClientTagRouter,
} from "../../src/modules/clients/routes/client.routes.js";
import type {
  ClientServiceContract,
  ClientTagServiceContract,
} from "../../src/modules/clients/services/client.service.js";
import {
  agentActor,
  clientId,
  createClientInput,
  ownerActor,
  preferenceId,
  tagId,
} from "./client.fixtures.js";

const responseRecord = {
  id: clientId,
  agencyId: ownerActor.agencyId,
  assignedAgentId: null,
  ...createClientInput,
  fullName: "Sara Ahmed",
  secondaryPhone: null,
  nationality: null,
  preferredLanguage: null,
  company: null,
  notes: null,
  nextFollowUpAt: null,
  lastContactAt: null,
  roles: [],
  tags: [],
  createdAt: "2026-07-28T12:00:00.000Z",
  updatedAt: "2026-07-28T12:00:00.000Z",
};

const serviceMock = (): ClientServiceContract => ({
  create: vi.fn().mockResolvedValue(responseRecord),
  list: vi.fn().mockResolvedValue({
    data: [responseRecord],
    pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  }),
  get: vi.fn().mockResolvedValue({ ...responseRecord, preferences: [] }),
  update: vi.fn().mockResolvedValue(responseRecord),
  remove: vi.fn().mockResolvedValue(undefined),
  assign: vi.fn().mockResolvedValue(responseRecord),
  listRoles: vi.fn().mockResolvedValue([]),
  addRole: vi.fn().mockResolvedValue(ClientRoleType.BUYER),
  removeRole: vi.fn().mockResolvedValue(undefined),
  listPreferences: vi.fn().mockResolvedValue([]),
  createPreference: vi.fn().mockResolvedValue({}),
  updatePreference: vi.fn().mockResolvedValue({}),
  removePreference: vi.fn().mockResolvedValue(undefined),
  listActivities: vi.fn().mockResolvedValue([]),
  createActivity: vi.fn().mockResolvedValue({}),
  assignTag: vi.fn().mockResolvedValue(undefined),
  removeTag: vi.fn().mockResolvedValue(undefined),
});

const testApp = (user?: AuthenticatedUser) => {
  const service = serviceMock();
  const authenticate: RequestHandler = (req, _res, next) => {
    if (user) req.user = user;
    next();
  };
  const app = express();
  app.use(express.json());
  app.use("/api/clients", createClientRouter(service, authenticate));
  app.use(errorHandler);
  return { app, service };
};

describe("client routes", () => {
  it("creates validated clients and rejects mass assignment", async () => {
    const { app, service } = testApp(ownerActor);
    const created = await request(app)
      .post("/api/clients")
      .send({ ...createClientInput, phone: "+964 (750) 123-4567" });
    expect(created.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(
      ownerActor,
      expect.objectContaining({ phone: "+9647501234567" }),
    );
    const invalid = await request(app)
      .post("/api/clients")
      .send({ ...createClientInput, agencyId: ownerActor.agencyId });
    expect(invalid.status).toBe(400);
  });

  it("parses search, filters, pagination, and defaults", async () => {
    const { app, service } = testApp(ownerActor);
    const result = await request(app).get("/api/clients").query({
      page: "2",
      pageSize: "25",
      search: " Sara ",
      role: "BUYER",
      leadStatus: "QUALIFIED",
      leadSource: "REFERRAL",
      priority: "HIGH",
      tagId,
    });
    expect(result.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(
      ownerActor,
      expect.objectContaining({
        page: 2,
        pageSize: 25,
        search: "Sara",
        role: ClientRoleType.BUYER,
        tagId,
      }),
    );
  });

  it("supports client, role, preference, activity, and tag routes", async () => {
    const { app, service } = testApp(ownerActor);
    expect((await request(app).get(`/api/clients/${clientId}`)).status).toBe(
      200,
    );
    expect(
      (
        await request(app)
          .post(`/api/clients/${clientId}/roles`)
          .send({ role: "BUYER" })
      ).status,
    ).toBe(201);
    expect(
      (
        await request(app)
          .post(`/api/clients/${clientId}/activities`)
          .send({ activityType: "CALL", description: "Follow-up call" })
      ).status,
    ).toBe(201);
    expect(
      (await request(app).put(`/api/clients/${clientId}/tags/${tagId}`)).status,
    ).toBe(204);
    expect(service.assignTag).toHaveBeenCalledWith(ownerActor, clientId, tagId);
    expect(
      (
        await request(app).delete(
          `/api/clients/${clientId}/preferences/${preferenceId}`,
        )
      ).status,
    ).toBe(204);
  });

  it("restricts assignment and deletion routes to managers", async () => {
    const { app, service } = testApp(agentActor);
    expect(
      (
        await request(app)
          .patch(`/api/clients/${clientId}/assignment`)
          .send({ assignedAgentId: agentActor.id })
      ).status,
    ).toBe(403);
    expect((await request(app).delete(`/api/clients/${clientId}`)).status).toBe(
      403,
    );
    expect(service.assign).not.toHaveBeenCalled();
  });

  it("rejects malformed UUIDs and invalid preference ranges", async () => {
    const { app, service } = testApp(ownerActor);
    expect((await request(app).get("/api/clients/not-a-uuid")).status).toBe(
      400,
    );
    const invalid = await request(app)
      .post(`/api/clients/${clientId}/preferences`)
      .send({
        propertyType: "VILLA",
        city: "Erbil",
        currency: "USD",
        minBudget: "500",
        maxBudget: "100",
      });
    expect(invalid.status).toBe(400);
    expect(service.createPreference).not.toHaveBeenCalled();
  });
});

describe("client tag catalog routes", () => {
  it("allows authenticated reads and manager-only CRUD", async () => {
    const tag = {
      id: tagId,
      agencyId: ownerActor.agencyId,
      name: "VIP",
      slug: "vip",
      color: "#C026D3",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const service: ClientTagServiceContract = {
      list: vi.fn().mockResolvedValue([tag]),
      get: vi.fn().mockResolvedValue(tag),
      create: vi.fn().mockResolvedValue(tag),
      update: vi.fn().mockResolvedValue(tag),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const build = (user: AuthenticatedUser) => {
      const app = express();
      app.use(express.json());
      app.use(
        "/api/client-tags",
        createClientTagRouter(service, (req, _res, next) => {
          req.user = user;
          next();
        }),
      );
      app.use(errorHandler);
      return app;
    };
    expect(
      (await request(build(agentActor)).get("/api/client-tags")).status,
    ).toBe(200);
    expect(
      (
        await request(build(agentActor))
          .post("/api/client-tags")
          .send({ name: "VIP", slug: "vip" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(build(ownerActor))
          .post("/api/client-tags")
          .send({ name: "VIP", slug: "vip", color: "#c026d3" })
      ).status,
    ).toBe(201);
  });
});
