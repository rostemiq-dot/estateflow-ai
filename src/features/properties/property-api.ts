import { apiFetch } from "../../lib/api";
import type { Property } from "./property-data";
import { listPropertyMedia, uploadPropertyImages } from "./property-media-api";

const PROPERTY_STORAGE_KEY = "estateflow-properties";

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

type PropertyListResponse = { data: BackendProperty[] };
type PropertyWriteResponse = { data: BackendProperty };

type PropertyMetadata = {
  version: 1;
  ownerName: string;
  ownerPhone: string;
  features: string[];
};

function readMetadata(notes: string | null): PropertyMetadata {
  if (!notes) return { version: 1, ownerName: "", ownerPhone: "", features: [] };

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
    referenceCode: property.referenceCode,
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
    referenceCode:
      property.referenceCode?.trim() ||
      property.id.slice(-12).replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
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

function readCachedPropertyImages(propertyId: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PROPERTY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const property = parsed.find(
      (item): item is { id?: unknown; images?: unknown } =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        (item as { id?: unknown }).id === propertyId,
    );

    return Array.isArray(property?.images)
      ? property.images.filter(
          (image): image is string => typeof image === "string" && image.length > 0,
        )
      : [];
  } catch {
    return [];
  }
}

export function rememberPropertyImages(propertyId: string, images: readonly string[]) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(PROPERTY_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return;

    const next = parsed.map((item) => {
      if (typeof item !== "object" || item === null || !("id" in item)) return item;
      if ((item as { id?: unknown }).id !== propertyId) return item;
      return { ...(item as Record<string, unknown>), images: [...images] };
    });

    window.localStorage.setItem(PROPERTY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Cache is only a compatibility layer; ignore cache failures.
  }
}

async function getPropertyImages(propertyId: string): Promise<string[]> {
  const cachedImages = readCachedPropertyImages(propertyId);

  try {
    // Always rebuild display URLs from persistent media records. Signed URLs
    // are short-lived and must never be treated as permanent database values.
    const media = await listPropertyMedia(propertyId);
    return media
      .filter((item) => item.mimeType.startsWith("image/") && item.url)
      .sort((a, b) => {
        if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
        return a.displayOrder - b.displayOrder;
      })
      .map((item) => item.url);
  } catch {
    // A temporary signing/network failure must not make an existing photo
    // disappear from the UI. Keep the last known image until the next retry.
    return cachedImages;
  }
}

async function hydrateProperty(property: BackendProperty): Promise<Property> {
  const mapped = fromBackendProperty(property);
  return { ...mapped, images: await getPropertyImages(property.id) };
}

function cacheDatabaseProperties(properties: readonly Property[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROPERTY_STORAGE_KEY, JSON.stringify(properties));
  } catch {
    // Ignore cache failures; database data is still returned to the caller.
  }
}

function dataUrlToFile(dataUrl: string, propertyId: string, index: number): File | null {
  const match = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!match) return null;

  try {
    const mimeType = match[1];
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let byteIndex = 0; byteIndex < binary.length; byteIndex += 1) {
      bytes[byteIndex] = binary.charCodeAt(byteIndex);
    }
    const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    return new File([bytes], `${propertyId}-${index}.${extension}`, { type: mimeType });
  } catch {
    return null;
  }
}

async function persistEditorImages(propertyId: string, images: readonly string[]) {
  const files = images
    .map((image, index) => dataUrlToFile(image, propertyId, index))
    .filter((file): file is File => file !== null);

  if (files.length === 0) return;

  const existingMedia = await listPropertyMedia(propertyId).catch(() => []);
  await uploadPropertyImages(propertyId, files, existingMedia.length);
}

export async function listPropertiesFromDatabase() {
  const response = await apiFetch<PropertyListResponse>(
    "/api/properties?page=1&pageSize=100&sortBy=updatedAt&sortOrder=desc",
  );
  const properties = await Promise.all(response.data.map(hydrateProperty));
  cacheDatabaseProperties(properties);
  return properties;
}

export async function createPropertyInDatabase(property: Property) {
  const response = await apiFetch<PropertyWriteResponse>("/api/properties", {
    method: "POST",
    body: JSON.stringify(toPayload(property)),
  });
  await persistEditorImages(response.data.id, property.images ?? []);
  return hydrateProperty(response.data);
}

export async function updatePropertyInDatabase(property: Property) {
  const response = await apiFetch<PropertyWriteResponse>(
    `/api/properties/${property.id}`,
    {
      method: "PATCH",
      body: JSON.stringify(toPayload(property)),
    },
  );
  await persistEditorImages(response.data.id, property.images ?? []);
  return hydrateProperty(response.data);
}

export async function deletePropertyFromDatabase(propertyId: string) {
  await apiFetch<void>(`/api/properties/${propertyId}`, {
    method: "DELETE",
  });
}
