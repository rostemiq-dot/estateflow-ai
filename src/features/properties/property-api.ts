import { apiFetch } from "../../lib/api";
import { requireSupabase } from "../../lib/supabase";
import type { Property } from "./property-data";

const PROPERTY_STORAGE_KEY = "estateflow-properties";
const PROPERTY_MEDIA_BUCKET = "property-media";
const MEDIA_URL_TTL_SECONDS = 60 * 60;

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

type ApiMediaItem = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  displayOrder: number;
  isCover: boolean;
};

type MediaListResponse = { data: ApiMediaItem[] };

type MediaCreateResponse = { data: ApiMediaItem };

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

async function getPropertyImages(propertyId: string): Promise<string[]> {
  try {
    const response = await apiFetch<MediaListResponse>(
      `/api/properties/${encodeURIComponent(propertyId)}/media`,
    );
    const imageItems = response.data
      .filter((item) => item.mimeType.startsWith("image/"))
      .sort((a, b) => a.displayOrder - b.displayOrder);

    if (imageItems.length === 0) return [];

    const supabase = requireSupabase();
    const urls = await Promise.all(
      imageItems.map(async (item) => {
        const { data, error } = await supabase.storage
          .from(PROPERTY_MEDIA_BUCKET)
          .createSignedUrl(item.storagePath, MEDIA_URL_TTL_SECONDS);
        return error || !data?.signedUrl ? "" : data.signedUrl;
      }),
    );

    return urls.filter(Boolean);
  } catch {
    // Property data should still render if the optional media request fails.
    return [];
  }
}

async function hydrateProperty(property: BackendProperty): Promise<Property> {
  const mapped = fromBackendProperty(property);
  return { ...mapped, images: await getPropertyImages(property.id) };
}

function cacheDatabaseProperties(properties: readonly Property[]) {
  if (typeof window === "undefined") return;
  try {
    // Keep a local mirror only for legacy synchronous modules such as Deals.
    // The database remains the source of truth; this mirror is refreshed every time
    // the database property list is loaded.
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
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
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

  const supabase = requireSupabase();
  const created: ApiMediaItem[] = [];

  for (const [index, file] of files.entries()) {
    const storagePath = `${propertyId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(PROPERTY_MEDIA_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw new Error(`Could not upload ${file.name}. ${uploadError.message}`);

    try {
      const response = await apiFetch<MediaCreateResponse>(
        `/api/properties/${encodeURIComponent(propertyId)}/media`,
        {
          method: "POST",
          body: JSON.stringify({
            mediaType: "IMAGE",
            storagePath,
            thumbnailPath: null,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            displayOrder: index,
            isCover: index === 0,
            metadata: null,
          }),
        },
      );
      created.push(response.data);
    } catch (error) {
      await supabase.storage.from(PROPERTY_MEDIA_BUCKET).remove([storagePath]);
      throw error;
    }
  }
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
  const saved = await hydrateProperty(response.data);
  return saved;
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
  const saved = await hydrateProperty(response.data);
  return saved;
}

export async function deletePropertyFromDatabase(propertyId: string) {
  await apiFetch<void>(`/api/properties/${propertyId}`, {
    method: "DELETE",
  });
}
