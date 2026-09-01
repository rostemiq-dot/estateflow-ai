import type {
  Currency,
  Prisma,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
} from "@prisma/client";
import type {
  CreatePropertyInput,
  ListPropertiesQuery,
  UpdatePropertyInput,
} from "../validators/property.validators.js";

export type PropertyWriteData = Omit<
  Prisma.PropertyUncheckedCreateInput,
  "price" | "latitude" | "longitude" | "areaSqm"
> & {
  price: string;
  latitude?: string | null;
  longitude?: string | null;
  areaSqm?: string | null;
};

export type PropertyUpdateData = Omit<
  UpdatePropertyInput,
  "price" | "latitude" | "longitude" | "areaSqm"
> & {
  price?: string;
  latitude?: string | null;
  longitude?: string | null;
  areaSqm?: string | null;
};

export type PropertyListOptions = ListPropertiesQuery & {
  agencyId: string;
};

export type PropertyResponse = {
  id: string;
  agencyId: string;
  createdById: string;
  assignedAgentId: string | null;
  title: string;
  description: string | null;
  referenceCode: string;
  purpose: PropertyPurpose;
  propertyType: PropertyType;
  status: PropertyStatus;
  price: string;
  currency: Currency;
  country: string;
  city: string;
  district: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: string | null;
  floor: number | null;
  totalFloors: number | null;
  parkingSpaces: number | null;
  yearBuilt: number | null;
  furnished: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
