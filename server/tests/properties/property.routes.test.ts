import { UserRole } from "@prisma/client";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/errors/app-error.js";
import { errorHandler } from "../../src/middleware/error-handler.js";
import type { AuthenticatedUser } from "../../src/modules/auth/types/auth.types.js";
import { createPropertyRouter } from "../../src/modules/properties/routes/property.routes.js";
import type { PropertyServiceContract } from "../../src/modules/properties/services/property.service.js";
import {
  agentActor,
  createPropertyInput,
  ownerActor,
  propertyFixture,
  propertyId,
} from "./property.fixtures.js";

const propertyResponse = {
  ...propertyFixture,
  price: "350000.00",
  latitude: "36.205",
  longitude: "44.0089",
  areaSqm: "420.50",
  createdAt: propertyFixture.createdAt.toISOString(),
  updatedAt: propertyFixture.updatedAt.toISOString(),
  deletedAt: undefined,
};

const createServiceMock = (): PropertyServiceContract => ({
  create: vi.fn().mockResolvedValue(propertyResponse),
  list: vi.fn().mockResolvedValue({
    data: [propertyResponse],
    pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  }),
  getById: vi.fn().mockResolvedValue(propertyResponse),
  update: vi.fn().mockResolvedValue(propertyResponse),
  remove: vi.fn().mockResolvedValue(undefined),
});

const createTestApp = (actor?: AuthenticatedUser) => {
  const service = createServiceMock();
  const authenticate: RequestHandler = (req, _res, next) => {
    if (actor) {
      req.user = actor;
      next();
      return;
    }

    next(new AppError("Authentication required", 401));
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/api/properties",
    createPropertyRouter({ propertyService: service, authenticate }),
  );
  app.use(errorHandler);
  return { app, service };
};

describe("property routes", () => {
  it("requires authentication for every property route", async () => {
    const { app } = createTestApp();
    const response = await request(app).get("/api/properties");

    expect(response.status).toBe(401);
  });

  it.each([UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT])(
    "allows %s to create a validated property",
    async (role) => {
      const actor = { ...ownerActor, role };
      const { app, service } = createTestApp(actor);
      const response = await request(app)
        .post("/api/properties")
        .send({ ...createPropertyInput, referenceCode: " ef-1001 " });

      expect(response.status).toBe(201);
      expect(service.create).toHaveBeenCalledWith(
        actor,
        expect.objectContaining({
          referenceCode: "EF-1001",
          price: "350000.00",
        }),
      );
      expect(response.body.data).not.toHaveProperty("deletedAt");
    },
  );

  it("rejects unknown fields and mass-assignment IDs", async () => {
    const { app, service } = createTestApp(ownerActor);
    const response = await request(app)
      .post("/api/properties")
      .send({
        ...createPropertyInput,
        agencyId: "99999999-9999-4999-8999-999999999999",
        createdById: "99999999-9999-4999-8999-999999999999",
      });

    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid decimal", { price: "12.345" }],
    ["negative price", { price: "-1.00" }],
    ["invalid latitude", { latitude: "90.000001" }],
  ])("rejects %s input", async (_label, invalidField) => {
    const { app, service } = createTestApp(ownerActor);
    const response = await request(app)
      .post("/api/properties")
      .send({ ...createPropertyInput, ...invalidField });

    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("parses listing filters, pagination, search, and sorting", async () => {
    const { app, service } = createTestApp(ownerActor);
    const response = await request(app).get("/api/properties").query({
      page: "2",
      pageSize: "25",
      search: " villa ",
      status: "AVAILABLE",
      propertyType: "VILLA",
      purpose: "SALE",
      currency: "USD",
      city: "Erbil",
      district: "Ankawa",
      minPrice: "100000",
      maxPrice: "500000",
      minBedrooms: "3",
      maxBedrooms: "6",
      minAreaSqm: "200",
      maxAreaSqm: "600",
      sortBy: "price",
      sortOrder: "asc",
    });

    expect(response.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(
      ownerActor,
      expect.objectContaining({
        page: 2,
        pageSize: 25,
        search: "villa",
        minPrice: "100000",
        maxBedrooms: 6,
        sortBy: "price",
        sortOrder: "asc",
      }),
    );
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("applies listing defaults and rejects excessive page sizes", async () => {
    const { app, service } = createTestApp(ownerActor);

    const defaultResponse = await request(app).get("/api/properties");
    expect(defaultResponse.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(ownerActor, {
      page: 1,
      pageSize: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    const invalidResponse = await request(app)
      .get("/api/properties")
      .query({ pageSize: 101 });
    expect(invalidResponse.status).toBe(400);
  });

  it("rejects inconsistent filter ranges", async () => {
    const { app, service } = createTestApp(ownerActor);
    const response = await request(app)
      .get("/api/properties")
      .query({ minPrice: "500", maxPrice: "100" });

    expect(response.status).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it("returns property details for a valid UUID", async () => {
    const { app, service } = createTestApp(ownerActor);
    const response = await request(app).get(`/api/properties/${propertyId}`);

    expect(response.status).toBe(200);
    expect(service.getById).toHaveBeenCalledWith(ownerActor, propertyId);
  });

  it("rejects malformed property UUIDs", async () => {
    const { app, service } = createTestApp(ownerActor);
    const response = await request(app).get("/api/properties/not-a-uuid");

    expect(response.status).toBe(400);
    expect(service.getById).not.toHaveBeenCalled();
  });

  it("requires a non-empty, strict patch body", async () => {
    const { app, service } = createTestApp(ownerActor);
    const empty = await request(app)
      .patch(`/api/properties/${propertyId}`)
      .send({});
    const forbidden = await request(app)
      .patch(`/api/properties/${propertyId}`)
      .send({ deletedAt: new Date().toISOString() });

    expect(empty.status).toBe(400);
    expect(forbidden.status).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
  });

  it("allows OWNER and ADMIN to delete but rejects AGENT", async () => {
    for (const role of [UserRole.OWNER, UserRole.ADMIN]) {
      const actor = { ...ownerActor, role };
      const { app, service } = createTestApp(actor);
      const response = await request(app).delete(
        `/api/properties/${propertyId}`,
      );

      expect(response.status).toBe(204);
      expect(service.remove).toHaveBeenCalledWith(actor, propertyId);
    }

    const { app, service } = createTestApp(agentActor);
    const denied = await request(app).delete(`/api/properties/${propertyId}`);
    expect(denied.status).toBe(403);
    expect(service.remove).not.toHaveBeenCalled();
  });
});
