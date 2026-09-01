import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  PrismaCatalogRepository,
  PrismaMediaRepository,
} from "../../src/modules/property-metadata/repositories/prisma-metadata.repository.js";
import {
  agencyId,
  catalogId,
  mediaId,
  propertyId,
} from "./metadata.fixtures.js";

describe("metadata repositories", () => {
  it("scopes media deletion through the owning non-deleted property", async () => {
    const propertyMedia = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const database = {
      property: {},
      propertyMedia,
      $transaction: vi.fn(),
    } as unknown as Pick<
      PrismaClient,
      "property" | "propertyMedia" | "$transaction"
    >;
    const deletedAt = new Date();

    await new PrismaMediaRepository(database).softDelete(
      agencyId,
      propertyId,
      mediaId,
      deletedAt,
    );

    expect(propertyMedia.updateMany).toHaveBeenCalledWith({
      where: {
        id: mediaId,
        propertyId,
        deletedAt: null,
        property: { agencyId, deletedAt: null },
      },
      data: { deletedAt, isCover: false },
    });
  });

  it("always scopes amenity lookups and updates to agency and active rows", async () => {
    const amenity = {
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
    const database = {
      amenity,
      propertyTag: {},
    } as unknown as Pick<PrismaClient, "amenity" | "propertyTag">;
    const repository = new PrismaCatalogRepository("amenity", database);

    await repository.update(agencyId, catalogId, { name: "Updated" });

    expect(amenity.updateMany).toHaveBeenCalledWith({
      where: { id: catalogId, agencyId, deletedAt: null },
      data: { name: "Updated" },
    });
  });
});
