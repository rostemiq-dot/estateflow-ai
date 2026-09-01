import { UserRole } from "@prisma/client";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middleware/error-handler.js";
import {
  createCatalogRouter,
  createMediaRouter,
} from "../../src/modules/property-metadata/routes/metadata.routes.js";
import type {
  AmenityServiceContract,
  MediaServiceContract,
} from "../../src/modules/property-metadata/services/metadata.service.js";
import {
  createAmenitySchema,
  updateAmenitySchema,
} from "../../src/modules/property-metadata/validators/metadata.validators.js";
import {
  actor,
  catalogId,
  mediaFixture,
  mediaId,
  mediaInput,
  propertyId,
} from "./metadata.fixtures.js";

const authenticate: RequestHandler = (req, _res, next) => {
  req.user = actor;
  next();
};
const mediaResponse = {
  ...mediaFixture,
  fileSize: "2048",
  createdAt: mediaFixture.createdAt.toISOString(),
  updatedAt: mediaFixture.updatedAt.toISOString(),
};

const mediaApp = () => {
  const service: MediaServiceContract = {
    list: vi.fn().mockResolvedValue([mediaResponse]),
    create: vi.fn().mockResolvedValue(mediaResponse),
    update: vi.fn().mockResolvedValue(mediaResponse),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/api/properties/:propertyId/media",
    createMediaRouter(service, authenticate),
  );
  app.use(errorHandler);
  return { app, service };
};

describe("media routes", () => {
  it("supports validated GET and POST metadata endpoints", async () => {
    const { app, service } = mediaApp();
    expect(
      (await request(app).get(`/api/properties/${propertyId}/media`)).status,
    ).toBe(200);
    const response = await request(app)
      .post(`/api/properties/${propertyId}/media`)
      .send(mediaInput);
    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(actor, propertyId, mediaInput);
    expect(response.body.data.fileSize).toBe("2048");
  });

  it("rejects invalid UUIDs, MIME types, and display order", async () => {
    const { app, service } = mediaApp();
    expect((await request(app).get("/api/properties/bad/media")).status).toBe(
      400,
    );
    const response = await request(app)
      .post(`/api/properties/${propertyId}/media`)
      .send({ ...mediaInput, mimeType: "video/mp4", displayOrder: -1 });
    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("supports PATCH and DELETE by media UUID", async () => {
    const { app, service } = mediaApp();
    expect(
      (
        await request(app)
          .patch(`/api/properties/${propertyId}/media/${mediaId}`)
          .send({ displayOrder: 3 })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app).delete(
          `/api/properties/${propertyId}/media/${mediaId}`,
        )
      ).status,
    ).toBe(204);
    expect(service.remove).toHaveBeenCalledWith(actor, propertyId, mediaId);
  });
});

describe("amenity routes", () => {
  it("provides CRUD and enforces catalog RBAC", async () => {
    const record = {
      id: catalogId,
      agencyId: actor.agencyId,
      name: "Pool",
      slug: "pool",
      icon: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const service: AmenityServiceContract = {
      list: vi.fn().mockResolvedValue([record]),
      get: vi.fn().mockResolvedValue(record),
      create: vi.fn().mockResolvedValue(record),
      update: vi.fn().mockResolvedValue(record),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const build = (role: UserRole) => {
      const app = express();
      app.use(express.json());
      app.use(
        "/api/amenities",
        createCatalogRouter(
          service,
          (req, _res, next) => {
            req.user = { ...actor, role };
            next();
          },
          { create: createAmenitySchema, update: updateAmenitySchema },
        ),
      );
      app.use(errorHandler);
      return app;
    };

    expect(
      (await request(build(UserRole.AGENT)).get("/api/amenities")).status,
    ).toBe(200);
    expect(
      (
        await request(build(UserRole.AGENT))
          .post("/api/amenities")
          .send({ name: "Pool", slug: "pool" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(build(UserRole.ADMIN))
          .post("/api/amenities")
          .send({ name: "Pool", slug: "pool" })
      ).status,
    ).toBe(201);
  });
});
