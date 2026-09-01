import type { Property } from "@prisma/client";
import type {
  PropertyListOptions,
  PropertyUpdateData,
  PropertyWriteData,
} from "../types/property.types.js";

export class DuplicateReferenceCodeError extends Error {
  constructor() {
    super("Duplicate agency property reference code");
    this.name = "DuplicateReferenceCodeError";
  }
}

export interface PropertyRepository {
  create(data: PropertyWriteData): Promise<Property>;
  list(
    options: PropertyListOptions,
  ): Promise<{ records: Property[]; total: number }>;
  findById(agencyId: string, propertyId: string): Promise<Property | null>;
  update(
    agencyId: string,
    propertyId: string,
    data: PropertyUpdateData,
  ): Promise<Property | null>;
  softDelete(
    agencyId: string,
    propertyId: string,
    deletedAt: Date,
  ): Promise<boolean>;
  isActiveUserInAgency(userId: string, agencyId: string): Promise<boolean>;
}
