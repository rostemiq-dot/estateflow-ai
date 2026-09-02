import { apiFetch } from "../../lib/api";
import type { Property } from "./property-data";

type BackendProperty = {
  id: string;
  title: string;
  description: string | null;
  referenceCode: string;
  purpose: "SALE" | "RENT";
  propertyType:
    | "APARTMENT"
    | "HOUSE"
    | "VILLA"
    | "LAND"
    | "OFFICE"
    | "SHOP"
    | "WAREHOUSE"
    | "BUILDING"
    | "OTHER";
  status:
    | "DRAFT"
    | "AVAILABLE"
    | "RESERVED"
    | "SOLD"
    | "RENTED"
    | "OFF_MARKET";
  price: string;
  currency: "USD" | "IQD";
  country: string;
  city: string;
  district: string | null;
  neighborhood: string | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type PropertyListResponse = {
  data: BackendProperty[];
};

type PropertyWriteResponse = {
  data: BackendProperty;
};

type PropertyMetadata = {
  version: 1;
  ownerName: string;
  ownerPhone: string;
  features: string[];
};

function readMetadata(notes: string | null): PropertyMetadata {
  if (!notes) {
    return { version: 1, ownerName: "", ownerPhone: "", features: [] };
  }

  try {
    const parsed = JSON.parse(notes) as Partial<PropertyMetadata>;
    if (parsed.version === 1) {
      return {
        version: 1,
        ownerName: typeof parsed.ownerName === "string" ? parsed.ownerName : "",
        ownerPhone: typeof parsed.ownerPhone === "string" ? parsed.ownerPhone : "",
        features: Array.isArray(parsed.features)
          ? parsed.features.filter((item): item is string => typeof item === "string")
          : [],
      };
    }
  } catch {
    // Older records may contain ordinary notes.
  }

  return { version: 1, ownerName: "", ownerPhone: "", features: [] };
}

function toPurpose(property: Property) {
  return property.purpose === "Rent" ? "RENT" : "SALE";
}

function toPropertyType(property: Property) {
  switch (property.propertyType) {
    case "Apartment":
      return "APARTMENT";
    case "House":
      return "HOUSE";
    case "Villa":
      return "VILLA";
    case "Land":
      return "LAND";
    case "Commercial":
      return "OTHER";
    default:
      return "OTHER";
  }
}

function toStatus(property: Property) {
  switch (property.status) {
    case "Available":
      return "AVAILABLE";
    case "Reserved":
      return "RESERVED";
    case "Under offer":
      return "RESERVED";
    case "Sold":
      return "SOLD";
    case "Rented":
      return "RENTED";
    default:
      return "DRAFT";
  }
}

function toMetadataNotes(property: Property) {
  return JSON.stringify({
    version: 1,
    ownerName: property.ownerName,
    ownerPhone: property.ownerPhone ?? "",
    features: property.features ?? [],
  } satisfies PropertyMetadata);
}

function fromBackendProperty(property: BackendProperty): Property {
  const metadata = readMetadata(property.notes);
  const statusMap: Record<BackendProperty["status"], Property["status"]> = {
    DRAFT: "Available",
    AVAILABLE: "Available",
    RESERVED: "Reserved",
    SOLD: "Sold",
    RENTED: "Rented",
    OFF_MARKET: "Reserved",
  };
  const typeMap: Record<BackendProperty["propertyType"], Property["propertyType"]> = {
    APARTMENT: "Apartment",
    HOUSE: "House",
    VILLA: "Villa",
    LAND: "Land",
    OFFICE: "Commercial",
    SHOP: "Commercial",
    WAREHOUSE: "Commercial",
    BUILDING: "Commercial",
    OTHER: "Commercial",
  };

  const location = [property.city, property.country].filter(Boolean).join(", ");

  return {
    id: property.id,
    title: property.title,
    district: property.district ?? "",
    location: property.address || location,
    purpose: property.purpose === "RENT" ? "Rent" : "Sale",
    status: statusMap[property.status],
    propertyType: typeMap[property.propertyType],
    price: Number(property.price) || 0,
    currency: property.currency,
    bedrooms: property.bedrooms ?? 0,
    bathrooms: property.bathrooms ?? 0,
    areaSqm: Number(property.areaSqm ?? 0),
    ownerName: metadata.ownerName,
    ownerPhone: metadata.ownerPhone,
    description: property.description ?? "",
    features: metadata.features,
    images: [],
    matchScore: 0,
    inquiriesThisWeek: 0,
    viewingsThisWeek: 0,
    updatedLabel: `Updated ${new Date(property.updatedAt).toLocaleString()}`,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
  };
}

function toPayload(property: Property) {
  return {
    title: property.title.trim() || "Untitled property",
    description: property.description?.trim() || null,
    referenceCode: property.referenceCode?.trim() || property.id.slice(-12).replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
    purpose: toPurpose(property),
    propertyType: toPropertyType(property),
    status: toStatus(property),
    price: String(Math.max(0, property.price)),
    currency: property.currency,
    country: "Iraq",
    city: property.location.split(",")[0]?.trim() || "Erbil",
    district: property.district.trim() || null,
    neighborhood: null,
    address: property.location.trim() || null,
    bedrooms: Math.max(0, Math.round(property.bedrooms)),
    bathrooms: Math.max(0, Math.round(property.bathrooms)),
    areaSqm: String(Math.max(0, property.areaSqm)),
    notes: toMetadataNotes(property),
  };
}

export async function listPropertiesFromDatabase() {
  const response = await apiFetch<PropertyListResponse>(
    "/api/properties?page=1&pageSize=100&sortBy=updatedAt&sortOrder=desc",
  );
  return response.data.map(fromBackendProperty);
}

export async function createPropertyInDatabase(property: Property) {
  const response = await apiFetch<PropertyWriteResponse>("/api/properties", {
    method: "POST",
    body: JSON.stringify(toPayload(property)),
  });
  return fromBackendProperty(response.data);
}

export async function updatePropertyInDatabase(property: Property) {
  const response = await apiFetch<PropertyWriteResponse>(
    `/api/properties/${property.id}`,
    {
      method: "PATCH",
      body: JSON.stringify(toPayload(property)),
    },
  );
  return fromBackendProperty(response.data);
}

export async function deletePropertyFromDatabase(propertyId: string) {
  await apiFetch<void>(`/api/properties/${propertyId}`, {
    method: "DELETE",
  });
}
