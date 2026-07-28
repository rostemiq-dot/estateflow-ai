import type { Amenity } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type {
  CatalogRepository,
  MediaRepository,
} from "../../src/modules/property-metadata/repositories/metadata.repository.js";
import {
  CatalogService,
  MediaService,
} from "../../src/modules/property-metadata/services/metadata.service.js";
import {
  actor,
  agencyId,
  catalogId,
  mediaFixture,
  mediaId,
  mediaInput,
  propertyId,
  userId,
} from "./metadata.fixtures.js";

const mediaRepository = (): MediaRepository => ({
  propertyExists: vi.fn(),
  propertyCanModify: vi.fn().mockResolvedValue(true),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
});

describe("MediaService", () => {
  it("derives agency and uploader IDs and serializes file size", async () => {
    const repository = mediaRepository();
    vi.mocked(repository.create).mockResolvedValue(mediaFixture);
    const service = new MediaService(repository);

    const result = await service.create(actor, propertyId, mediaInput);

    expect(repository.create).toHaveBeenCalledWith(
      agencyId,
      propertyId,
      userId,
      mediaInput,
    );
    expect(result.fileSize).toBe("2048");
  });

  it("does not expose missing or cross-agency records", async () => {
    const repository = mediaRepository();
    vi.mocked(repository.update).mockResolvedValue(null);
    await expect(
      new MediaService(repository).update(actor, propertyId, mediaId, {
        displayOrder: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("soft deletes using the injected clock", async () => {
    const repository = mediaRepository();
    vi.mocked(repository.softDelete).mockResolvedValue(true);
    const now = new Date("2026-07-28T15:00:00.000Z");
    await new MediaService(repository, () => now).remove(
      actor,
      propertyId,
      mediaId,
    );
    expect(repository.softDelete).toHaveBeenCalledWith(
      agencyId,
      propertyId,
      mediaId,
      now,
    );
  });
});

describe("CatalogService", () => {
  it("scopes catalog CRUD to the actor agency", async () => {
    const amenity: Amenity = {
      id: catalogId,
      agencyId,
      name: "Pool",
      slug: "pool",
      icon: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const repository: CatalogRepository<Amenity> = {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn().mockResolvedValue(amenity),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    const result = await new CatalogService("Amenity", repository).create(
      actor,
      { name: "Pool", slug: "pool" },
    );
    expect(repository.create).toHaveBeenCalledWith(agencyId, {
      name: "Pool",
      slug: "pool",
    });
    expect(result.id).toBe(catalogId);
  });
});
