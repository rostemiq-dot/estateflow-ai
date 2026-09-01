import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type {
  CatalogCreateInput,
  CatalogKind,
  CatalogRecord,
  CatalogRepository,
  CatalogUpdateInput,
} from "./metadata.repository.js";

const catalogError = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new Error("A catalog item with this name or slug already exists");
  }
  throw error;
};

type CatalogDatabase = Pick<PrismaClient, "amenity" | "propertyTag">;

export class PrismaCatalogRepository<T extends CatalogRecord>
  implements CatalogRepository<T>
{
  constructor(
    private readonly kind: CatalogKind,
    private readonly database: CatalogDatabase = prisma,
  ) {}

  list(agencyId: string): Promise<T[]> {
    const query = {
      where: { agencyId, deletedAt: null },
      orderBy: { name: "asc" },
    } as const;
    return (
      this.kind === "amenity"
        ? this.database.amenity.findMany(query)
        : this.database.propertyTag.findMany(query)
    ) as unknown as Promise<T[]>;
  }

  findById(agencyId: string, id: string): Promise<T | null> {
    const query = { where: { id, agencyId, deletedAt: null } };
    return (
      this.kind === "amenity"
        ? this.database.amenity.findFirst(query)
        : this.database.propertyTag.findFirst(query)
    ) as unknown as Promise<T | null>;
  }

  async create(agencyId: string, input: CatalogCreateInput): Promise<T> {
    try {
      const data = { ...input, agencyId };
      return (
        this.kind === "amenity"
          ? await this.database.amenity.create({
              data: data as Prisma.AmenityUncheckedCreateInput,
            })
          : await this.database.propertyTag.create({
              data: data as Prisma.PropertyTagUncheckedCreateInput,
            })
      ) as T;
    } catch (error) {
      return catalogError(error);
    }
  }

  async update(
    agencyId: string,
    id: string,
    input: CatalogUpdateInput,
  ): Promise<T | null> {
    try {
      const where = { id, agencyId, deletedAt: null };
      const result =
        this.kind === "amenity"
          ? await this.database.amenity.updateMany({
              where,
              data: input as Prisma.AmenityUpdateManyMutationInput,
            })
          : await this.database.propertyTag.updateMany({
              where,
              data: input as Prisma.PropertyTagUpdateManyMutationInput,
            });
      return result.count === 1 ? this.findById(agencyId, id) : null;
    } catch (error) {
      return catalogError(error);
    }
  }

  async softDelete(agencyId: string, id: string, deletedAt: Date) {
    const query = {
      where: { id, agencyId, deletedAt: null },
      data: { deletedAt },
    };
    const result =
      this.kind === "amenity"
        ? await this.database.amenity.updateMany(query)
        : await this.database.propertyTag.updateMany(query);
    return result.count === 1;
  }
}
