import {
  Currency,
  Prisma,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
  type PrismaClient,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  buildPropertyWhere,
  PrismaPropertyRepository,
} from "../../src/modules/properties/repositories/prisma-property.repository.js";
import { DuplicateReferenceCodeError } from "../../src/modules/properties/repositories/property.repository.js";
import {
  agencyId,
  createPropertyInput,
  ownerId,
  propertyFixture,
  propertyId,
} from "./property.fixtures.js";

const createDatabaseMock = () => {
  const property = {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  };
  const user = {
    findFirst: vi.fn(),
  };
  const database = {
    property,
    user,
  } as unknown as Pick<PrismaClient, "property" | "user">;

  return { database, property, user };
};

describe("PrismaPropertyRepository agency scoping", () => {
  it("combines agency, ID, and soft-delete conditions for details", async () => {
    const { database, property } = createDatabaseMock();
    property.findFirst.mockResolvedValue(propertyFixture);
    const repository = new PrismaPropertyRepository(database);

    await repository.findById(agencyId, propertyId);

    expect(property.findFirst).toHaveBeenCalledWith({
      where: {
        id: propertyId,
        agencyId,
        deletedAt: null,
      },
    });
  });

  it("always scopes list/search/filter queries to agency and non-deleted rows", async () => {
    const { database, property } = createDatabaseMock();
    property.findMany.mockResolvedValue([propertyFixture]);
    property.count.mockResolvedValue(1);
    const repository = new PrismaPropertyRepository(database);

    await repository.list({
      agencyId,
      page: 2,
      pageSize: 10,
      search: "villa",
      status: PropertyStatus.AVAILABLE,
      propertyType: PropertyType.VILLA,
      purpose: PropertyPurpose.SALE,
      currency: Currency.USD,
      city: "Erbil",
      minPrice: "100000",
      maxPrice: "500000",
      sortBy: "price",
      sortOrder: "asc",
    });

    const call = property.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({
      agencyId,
      deletedAt: null,
      status: PropertyStatus.AVAILABLE,
      propertyType: PropertyType.VILLA,
      city: { equals: "Erbil", mode: "insensitive" },
    });
    expect(call.where.OR).toHaveLength(6);
    expect(call).toMatchObject({
      orderBy: { price: "asc" },
      skip: 10,
      take: 10,
    });
    expect(property.count).toHaveBeenCalledWith({ where: call.where });
  });

  it("uses scoped conditions for updates and soft deletion", async () => {
    const { database, property } = createDatabaseMock();
    property.updateMany.mockResolvedValue({ count: 1 });
    property.findFirst.mockResolvedValue({
      ...propertyFixture,
      title: "Updated",
    });
    const repository = new PrismaPropertyRepository(database);

    await repository.update(agencyId, propertyId, { title: "Updated" });
    expect(property.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: propertyId, agencyId, deletedAt: null },
      }),
    );

    const deletedAt = new Date("2026-07-28T12:00:00.000Z");
    await repository.softDelete(agencyId, propertyId, deletedAt);
    expect(property.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: propertyId, agencyId, deletedAt: null },
      data: { deletedAt },
    });
  });

  it("scopes active assignment checks to the same agency", async () => {
    const { database, user } = createDatabaseMock();
    user.findFirst.mockResolvedValue({ id: ownerId });
    const repository = new PrismaPropertyRepository(database);

    await expect(
      repository.isActiveUserInAgency(ownerId, agencyId),
    ).resolves.toBe(true);
    expect(user.findFirst).toHaveBeenCalledWith({
      where: { id: ownerId, agencyId, isActive: true },
      select: { id: true },
    });
  });

  it("maps Prisma uniqueness errors without exposing internals", async () => {
    const { database, property } = createDatabaseMock();
    property.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
      }),
    );
    const repository = new PrismaPropertyRepository(database);

    await expect(
      repository.create({
        ...createPropertyInput,
        agencyId,
        createdById: ownerId,
        assignedAgentId: null,
      }),
    ).rejects.toBeInstanceOf(DuplicateReferenceCodeError);
  });
});

describe("buildPropertyWhere", () => {
  it("cannot build an unscoped or deleted-inclusive property query", () => {
    const where = buildPropertyWhere({
      agencyId,
      page: 1,
      pageSize: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(where).toEqual({
      agencyId,
      deletedAt: null,
    });
  });
});
