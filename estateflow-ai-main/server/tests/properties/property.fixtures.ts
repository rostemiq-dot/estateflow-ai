import {
  Currency,
  Prisma,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
  UserRole,
  type Property,
} from "@prisma/client";
import type { AuthenticatedUser } from "../../src/modules/auth/types/auth.types.js";
import type { PropertyRepository } from "../../src/modules/properties/repositories/property.repository.js";
import { vi } from "vitest";

export const agencyId = "22222222-2222-4222-8222-222222222222";
export const otherAgencyId = "99999999-9999-4999-8999-999999999999";
export const ownerId = "11111111-1111-4111-8111-111111111111";
export const agentId = "33333333-3333-4333-8333-333333333333";
export const otherAgentId = "44444444-4444-4444-8444-444444444444";
export const propertyId = "55555555-5555-4555-8555-555555555555";

export const ownerActor: AuthenticatedUser = {
  id: ownerId,
  email: "owner@example.com",
  agencyId,
  role: UserRole.OWNER,
};

export const adminActor: AuthenticatedUser = {
  ...ownerActor,
  id: "66666666-6666-4666-8666-666666666666",
  email: "admin@example.com",
  role: UserRole.ADMIN,
};

export const agentActor: AuthenticatedUser = {
  ...ownerActor,
  id: agentId,
  email: "agent@example.com",
  role: UserRole.AGENT,
};

export const propertyFixture: Property = {
  id: propertyId,
  agencyId,
  createdById: ownerId,
  assignedAgentId: agentId,
  title: "Modern family villa",
  description: "A spacious villa in a quiet neighborhood.",
  referenceCode: "EF-1001",
  purpose: PropertyPurpose.SALE,
  propertyType: PropertyType.VILLA,
  status: PropertyStatus.AVAILABLE,
  price: new Prisma.Decimal("350000.00"),
  currency: Currency.USD,
  country: "Iraq",
  city: "Erbil",
  district: "Ankawa",
  neighborhood: null,
  address: "100m Road",
  latitude: new Prisma.Decimal("36.205000"),
  longitude: new Prisma.Decimal("44.008900"),
  bedrooms: 4,
  bathrooms: 3,
  areaSqm: new Prisma.Decimal("420.50"),
  floor: 1,
  totalFloors: 2,
  parkingSpaces: 2,
  yearBuilt: 2024,
  furnished: false,
  notes: "Owner prefers afternoon viewings.",
  createdAt: new Date("2026-07-28T00:00:00.000Z"),
  updatedAt: new Date("2026-07-28T00:00:00.000Z"),
  deletedAt: null,
};

export const createPropertyInput = {
  title: propertyFixture.title,
  description: propertyFixture.description,
  referenceCode: propertyFixture.referenceCode,
  purpose: propertyFixture.purpose,
  propertyType: propertyFixture.propertyType,
  status: propertyFixture.status,
  price: "350000.00",
  currency: propertyFixture.currency,
  country: propertyFixture.country,
  city: propertyFixture.city,
  district: propertyFixture.district,
  neighborhood: propertyFixture.neighborhood,
  address: propertyFixture.address,
  latitude: "36.205000",
  longitude: "44.008900",
  bedrooms: propertyFixture.bedrooms,
  bathrooms: propertyFixture.bathrooms,
  areaSqm: "420.50",
  floor: propertyFixture.floor,
  totalFloors: propertyFixture.totalFloors,
  parkingSpaces: propertyFixture.parkingSpaces,
  yearBuilt: propertyFixture.yearBuilt,
  furnished: propertyFixture.furnished,
  notes: propertyFixture.notes,
};

export const createPropertyRepositoryMock = (): PropertyRepository => ({
  create: vi.fn(),
  list: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  isActiveUserInAgency: vi.fn(),
});
