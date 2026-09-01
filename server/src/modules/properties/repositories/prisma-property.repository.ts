import { Prisma, type PrismaClient, type Property } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type {
  PropertyListOptions,
  PropertyUpdateData,
  PropertyWriteData,
} from "../types/property.types.js";
import {
  DuplicateReferenceCodeError,
  type PropertyRepository,
} from "./property.repository.js";

type PropertyDatabase = Pick<PrismaClient, "property" | "user">;

export class PrismaPropertyRepository implements PropertyRepository {
  constructor(private readonly database: PropertyDatabase = prisma) {}

  async create(data: PropertyWriteData): Promise<Property> {
    try {
      return await this.database.property.create({
        data: toCreateData(data),
      });
    } catch (error) {
      return throwMappedWriteError(error);
    }
  }

  async list(
    options: PropertyListOptions,
  ): Promise<{ records: Property[]; total: number }> {
    const where = buildPropertyWhere(options);
    const orderBy = {
      [options.sortBy]: options.sortOrder,
    } satisfies Prisma.PropertyOrderByWithRelationInput;
    const skip = (options.page - 1) * options.pageSize;

    const [records, total] = await Promise.all([
      this.database.property.findMany({
        where,
        orderBy,
        skip,
        take: options.pageSize,
      }),
      this.database.property.count({ where }),
    ]);

    return { records, total };
  }

  findById(agencyId: string, propertyId: string): Promise<Property | null> {
    return this.database.property.findFirst({
      where: { id: propertyId, agencyId, deletedAt: null },
    });
  }

  async update(
    agencyId: string,
    propertyId: string,
    data: PropertyUpdateData,
  ): Promise<Property | null> {
    try {
      const update = await this.database.property.updateMany({
        where: { id: propertyId, agencyId, deletedAt: null },
        data: toUpdateData(data),
      });
      if (update.count !== 1) return null;
      return this.findById(agencyId, propertyId);
    } catch (error) {
      return throwMappedWriteError(error);
    }
  }

  async softDelete(agencyId: string, propertyId: string, deletedAt: Date): Promise<boolean> {
    const result = await this.database.property.updateMany({
      where: { id: propertyId, agencyId, deletedAt: null },
      data: { deletedAt },
    });
    return result.count === 1;
  }

  async isActiveUserInAgency(userId: string, agencyId: string): Promise<boolean> {
    const user = await this.database.user.findFirst({
      where: { id: userId, agencyId, isActive: true },
      select: { id: true },
    });
    return user !== null;
  }
}

export const buildPropertyWhere = (
  options: PropertyListOptions,
): Prisma.PropertyWhereInput => ({
  agencyId: options.agencyId,
  deletedAt: null,
  ...(options.search
    ? {
        OR: ["title", "referenceCode", "city", "district", "neighborhood", "address"].map(
          (field) => ({
            [field]: {
              contains: options.search,
              mode: Prisma.QueryMode.insensitive,
            },
          }),
        ),
      }
    : {}),
  ...(options.status ? { status: options.status } : {}),
  ...(options.propertyType ? { propertyType: options.propertyType } : {}),
  ...(options.purpose ? { purpose: options.purpose } : {}),
  ...(options.currency ? { currency: options.currency } : {}),
  ...(options.city
    ? { city: { equals: options.city, mode: Prisma.QueryMode.insensitive } }
    : {}),
  ...(options.district
    ? { district: { equals: options.district, mode: Prisma.QueryMode.insensitive } }
    : {}),
  ...(options.assignedAgentId ? { assignedAgentId: options.assignedAgentId } : {}),
  ...(options.minPrice !== undefined || options.maxPrice !== undefined
    ? {
        price: {
          ...(options.minPrice !== undefined ? { gte: new Prisma.Decimal(options.minPrice) } : {}),
          ...(options.maxPrice !== undefined ? { lte: new Prisma.Decimal(options.maxPrice) } : {}),
        },
      }
    : {}),
  ...(options.minBedrooms !== undefined || options.maxBedrooms !== undefined
    ? {
        bedrooms: {
          ...(options.minBedrooms !== undefined ? { gte: options.minBedrooms } : {}),
          ...(options.maxBedrooms !== undefined ? { lte: options.maxBedrooms } : {}),
        },
      }
    : {}),
  ...(options.minAreaSqm !== undefined || options.maxAreaSqm !== undefined
    ? {
        areaSqm: {
          ...(options.minAreaSqm !== undefined
            ? { gte: new Prisma.Decimal(options.minAreaSqm) }
            : {}),
          ...(options.maxAreaSqm !== undefined
            ? { lte: new Prisma.Decimal(options.maxAreaSqm) }
            : {}),
        },
      }
    : {}),
});

const toCreateData = (
  data: PropertyWriteData,
): Prisma.PropertyUncheckedCreateInput => {
  const { price, latitude, longitude, areaSqm, ...rest } = data;
  return {
    ...rest,
    price: new Prisma.Decimal(price),
    latitude: latitude == null ? latitude : new Prisma.Decimal(latitude),
    longitude: longitude == null ? longitude : new Prisma.Decimal(longitude),
    areaSqm: areaSqm == null ? areaSqm : new Prisma.Decimal(areaSqm),
  };
};

const toUpdateData = (
  data: PropertyUpdateData,
): Prisma.PropertyUpdateManyMutationInput => {
  const { price, latitude, longitude, areaSqm, ...rest } = data;
  return {
    ...rest,
    ...(price !== undefined ? { price: new Prisma.Decimal(price) } : {}),
    ...(latitude !== undefined
      ? { latitude: latitude === null ? null : new Prisma.Decimal(latitude) }
      : {}),
    ...(longitude !== undefined
      ? { longitude: longitude === null ? null : new Prisma.Decimal(longitude) }
      : {}),
    ...(areaSqm !== undefined
      ? { areaSqm: areaSqm === null ? null : new Prisma.Decimal(areaSqm) }
      : {}),
  };
};

const throwMappedWriteError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new DuplicateReferenceCodeError();
  }
  throw error;
};
