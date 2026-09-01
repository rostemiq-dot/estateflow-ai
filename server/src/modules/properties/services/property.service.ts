import { UserRole, type Property } from "@prisma/client";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import {
  DuplicateReferenceCodeError,
  type PropertyRepository,
} from "../repositories/property.repository.js";
import type {
  PropertyResponse,
  PropertyUpdateData,
  PropertyWriteData,
} from "../types/property.types.js";
import type {
  CreatePropertyInput,
  ListPropertiesQuery,
  UpdatePropertyInput,
} from "../validators/property.validators.js";

type Clock = () => Date;

export interface PropertyServiceContract {
  create(
    actor: AuthenticatedUser,
    input: CreatePropertyInput,
  ): Promise<PropertyResponse>;
  list(
    actor: AuthenticatedUser,
    query: ListPropertiesQuery,
  ): Promise<{
    data: PropertyResponse[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>;
  getById(
    actor: AuthenticatedUser,
    propertyId: string,
  ): Promise<PropertyResponse>;
  update(
    actor: AuthenticatedUser,
    propertyId: string,
    input: UpdatePropertyInput,
  ): Promise<PropertyResponse>;
  remove(actor: AuthenticatedUser, propertyId: string): Promise<void>;
}

export class PropertyService implements PropertyServiceContract {
  constructor(
    private readonly repository: PropertyRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async create(
    actor: AuthenticatedUser,
    input: CreatePropertyInput,
  ): Promise<PropertyResponse> {
    const assignedAgentId = input.assignedAgentId ?? null;
    await this.validateAssignment(actor, assignedAgentId);

    const data: PropertyWriteData = {
      ...input,
      agencyId: actor.agencyId,
      createdById: actor.id,
      assignedAgentId,
      referenceCode: input.referenceCode.toUpperCase(),
    };

    try {
      return toPropertyResponse(await this.repository.create(data));
    } catch (error) {
      throw mapPropertyWriteError(error);
    }
  }

  async list(actor: AuthenticatedUser, query: ListPropertiesQuery) {
    const { records, total } = await this.repository.list({
      ...query,
      agencyId: actor.agencyId,
    });

    return {
      data: records.map(toPropertyResponse),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getById(
    actor: AuthenticatedUser,
    propertyId: string,
  ): Promise<PropertyResponse> {
    const property = await this.getAvailableProperty(
      actor.agencyId,
      propertyId,
    );
    return toPropertyResponse(property);
  }

  async update(
    actor: AuthenticatedUser,
    propertyId: string,
    input: UpdatePropertyInput,
  ): Promise<PropertyResponse> {
    const current = await this.getAvailableProperty(actor.agencyId, propertyId);

    if (
      actor.role === UserRole.AGENT &&
      current.createdById !== actor.id &&
      current.assignedAgentId !== actor.id
    ) {
      throw new AppError("Insufficient permissions", 403);
    }

    if (input.assignedAgentId !== undefined) {
      await this.validateAssignment(actor, input.assignedAgentId);
    }

    const data: PropertyUpdateData = {
      ...input,
      ...(input.referenceCode
        ? { referenceCode: input.referenceCode.toUpperCase() }
        : {}),
    };

    try {
      const updated = await this.repository.update(
        actor.agencyId,
        propertyId,
        data,
      );

      if (!updated) {
        throw propertyNotFound();
      }

      return toPropertyResponse(updated);
    } catch (error) {
      throw mapPropertyWriteError(error);
    }
  }

  async remove(actor: AuthenticatedUser, propertyId: string): Promise<void> {
    if (actor.role !== UserRole.OWNER && actor.role !== UserRole.ADMIN) {
      throw new AppError("Insufficient permissions", 403);
    }

    const deleted = await this.repository.softDelete(
      actor.agencyId,
      propertyId,
      this.clock(),
    );

    if (!deleted) {
      throw propertyNotFound();
    }
  }

  private async getAvailableProperty(agencyId: string, propertyId: string) {
    const property = await this.repository.findById(agencyId, propertyId);

    if (!property) {
      throw propertyNotFound();
    }

    return property;
  }

  private async validateAssignment(
    actor: AuthenticatedUser,
    assignedAgentId: string | null,
  ) {
    if (assignedAgentId === null) {
      return;
    }

    if (actor.role === UserRole.AGENT && assignedAgentId !== actor.id) {
      throw new AppError(
        "Agents may only assign properties to themselves",
        403,
      );
    }

    if (
      !(await this.repository.isActiveUserInAgency(
        assignedAgentId,
        actor.agencyId,
      ))
    ) {
      throw new AppError("Assigned agent is unavailable", 400);
    }
  }
}

const toPropertyResponse = (property: Property): PropertyResponse => ({
  id: property.id,
  agencyId: property.agencyId,
  createdById: property.createdById,
  assignedAgentId: property.assignedAgentId,
  title: property.title,
  description: property.description,
  referenceCode: property.referenceCode,
  purpose: property.purpose,
  propertyType: property.propertyType,
  status: property.status,
  price: property.price.toFixed(2),
  currency: property.currency,
  country: property.country,
  city: property.city,
  district: property.district,
  neighborhood: property.neighborhood,
  address: property.address,
  latitude: property.latitude?.toString() ?? null,
  longitude: property.longitude?.toString() ?? null,
  bedrooms: property.bedrooms,
  bathrooms: property.bathrooms,
  areaSqm: property.areaSqm?.toFixed(2) ?? null,
  floor: property.floor,
  totalFloors: property.totalFloors,
  parkingSpaces: property.parkingSpaces,
  yearBuilt: property.yearBuilt,
  furnished: property.furnished,
  notes: property.notes,
  createdAt: property.createdAt.toISOString(),
  updatedAt: property.updatedAt.toISOString(),
});

const propertyNotFound = () => new AppError("Property not found", 404);

const mapPropertyWriteError = (error: unknown): Error => {
  if (error instanceof DuplicateReferenceCodeError) {
    return new AppError("Property reference code already exists", 409);
  }

  return error instanceof Error
    ? error
    : new AppError("Internal server error", 500, false);
};
