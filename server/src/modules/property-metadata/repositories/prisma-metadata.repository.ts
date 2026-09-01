import { Prisma, type PrismaClient, type PropertyMedia } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type {
  CatalogCreateInput,
  CatalogKind,
  CatalogRecord,
  CatalogRepository,
  CatalogUpdateInput,
  MediaRepository,
} from "./metadata.repository.js";
import { DuplicateCatalogSlugError } from "./metadata.repository.js";
import type {
  CreateMediaInput,
  UpdateMediaInput,
} from "../validators/metadata.validators.js";

type MediaDatabase = Pick<
  PrismaClient,
  "property" | "propertyMedia" | "$transaction"
>;

export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly database: MediaDatabase = prisma) {}

  async propertyExists(agencyId: string, propertyId: string) {
    return (
      (await this.database.property.count({
        where: { id: propertyId, agencyId, deletedAt: null },
      })) === 1
    );
  }

  async propertyCanModify(
    agencyId: string,
    propertyId: string,
    userId: string,
    privileged: boolean,
  ) {
    return (
      (await this.database.property.count({
        where: {
          id: propertyId,
          agencyId,
          deletedAt: null,
          ...(privileged
            ? {}
            : { OR: [{ createdById: userId }, { assignedAgentId: userId }] }),
        },
      })) === 1
    );
  }

  list(agencyId: string, propertyId: string): Promise<PropertyMedia[]> {
    return this.database.propertyMedia.findMany({
      where: {
        propertyId,
        property: { agencyId, deletedAt: null },
        deletedAt: null,
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async create(
    agencyId: string,
    propertyId: string,
    uploadedById: string,
    input: CreateMediaInput,
  ): Promise<PropertyMedia | null> {
    if (!(await this.propertyExists(agencyId, propertyId))) return null;
    return this.createInTransaction(propertyId, uploadedById, input);
  }

  private async createInTransaction(
    propertyId: string,
    uploadedById: string,
    input: CreateMediaInput,
  ) {
    return (this.database as PrismaClient).$transaction(async (tx) => {
      if (input.isCover) {
        await tx.propertyMedia.updateMany({
          where: { propertyId, deletedAt: null, isCover: true },
          data: { isCover: false },
        });
      }
      return tx.propertyMedia.create({
        data: toMediaCreate(propertyId, uploadedById, input),
      });
    });
  }

  async update(
    agencyId: string,
    propertyId: string,
    mediaId: string,
    input: UpdateMediaInput,
  ): Promise<PropertyMedia | null> {
    const exists = await this.database.propertyMedia.findFirst({
      where: {
        id: mediaId,
        propertyId,
        deletedAt: null,
        property: { agencyId, deletedAt: null },
      },
    });
    if (!exists) return null;
    return this.database.$transaction(async (tx) => {
      if (input.isCover) {
        await tx.propertyMedia.updateMany({
          where: {
            propertyId,
            deletedAt: null,
            isCover: true,
            id: { not: mediaId },
          },
          data: { isCover: false },
        });
      }
      return tx.propertyMedia.update({
        where: { id: mediaId },
        data: toMediaUpdate(input),
      });
    });
  }

  async softDelete(
    agencyId: string,
    propertyId: string,
    mediaId: string,
    deletedAt: Date,
  ) {
    const result = await this.database.propertyMedia.updateMany({
      where: {
        id: mediaId,
        propertyId,
        deletedAt: null,
        property: { agencyId, deletedAt: null },
      },
      data: { deletedAt, isCover: false },
    });
    return result.count === 1;
  }
}

type CatalogDatabase = Pick<PrismaClient, "amenity" | "propertyTag">;

export class PrismaCatalogRepository<
  T extends CatalogRecord,
> implements CatalogRepository<T> {
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
      return throwCatalogError(error);
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
      return throwCatalogError(error);
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

const toMediaCreate = (
  propertyId: string,
  uploadedById: string,
  input: CreateMediaInput,
): Prisma.PropertyMediaUncheckedCreateInput => ({
  ...input,
  fileSize: BigInt(input.fileSize),
  metadata: input.metadata ?? undefined,
  propertyId,
  uploadedById,
});

const toMediaUpdate = (
  input: UpdateMediaInput,
): Prisma.PropertyMediaUpdateInput => ({
  ...input,
  ...(input.fileSize !== undefined ? { fileSize: BigInt(input.fileSize) } : {}),
  metadata: input.metadata === null ? Prisma.JsonNull : input.metadata,
});

const throwCatalogError = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new DuplicateCatalogSlugError();
  }
  throw error;
};
