import type { Amenity, PropertyMedia, PropertyTag } from "@prisma/client";
import type {
  CreateAmenityInput,
  CreateMediaInput,
  CreateTagInput,
  UpdateAmenityInput,
  UpdateMediaInput,
  UpdateTagInput,
} from "../validators/metadata.validators.js";

export class DuplicateCatalogSlugError extends Error {}

export interface MediaRepository {
  propertyExists(agencyId: string, propertyId: string): Promise<boolean>;
  propertyCanModify(
    agencyId: string,
    propertyId: string,
    userId: string,
    privileged: boolean,
  ): Promise<boolean>;
  list(agencyId: string, propertyId: string): Promise<PropertyMedia[]>;
  create(
    agencyId: string,
    propertyId: string,
    uploadedById: string,
    input: CreateMediaInput,
  ): Promise<PropertyMedia | null>;
  update(
    agencyId: string,
    propertyId: string,
    mediaId: string,
    input: UpdateMediaInput,
  ): Promise<PropertyMedia | null>;
  softDelete(
    agencyId: string,
    propertyId: string,
    mediaId: string,
    deletedAt: Date,
  ): Promise<boolean>;
}

export type CatalogRecord = Amenity | PropertyTag;
export type CatalogKind = "amenity" | "tag";
export type CatalogCreateInput = CreateAmenityInput | CreateTagInput;
export type CatalogUpdateInput = UpdateAmenityInput | UpdateTagInput;

export interface CatalogRepository<T extends CatalogRecord = CatalogRecord> {
  list(agencyId: string): Promise<T[]>;
  findById(agencyId: string, id: string): Promise<T | null>;
  create(agencyId: string, input: CatalogCreateInput): Promise<T>;
  update(
    agencyId: string,
    id: string,
    input: CatalogUpdateInput,
  ): Promise<T | null>;
  softDelete(agencyId: string, id: string, deletedAt: Date): Promise<boolean>;
}
