import { apiFetch } from "../../lib/api";
import { requireSupabase } from "../../lib/supabase";

const BUCKET = "property-media";
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export type PropertyMediaItem = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  displayOrder: number;
  isCover: boolean;
  url: string;
};

type ApiMediaItem = Omit<PropertyMediaItem, "url"> & {
  thumbnailPath: string | null;
  mediaType: "IMAGE" | "VIDEO" | "PDF" | "FLOOR_PLAN" | "TOUR_360";
  width: number | null;
  height: number | null;
  duration: number | null;
  metadata: unknown;
  propertyId: string;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type MediaListResponse = { data: ApiMediaItem[] };
type MediaCreateResponse = { data: ApiMediaItem };

async function signedUrl(storagePath: string) {
  const { data, error } = await requireSupabase().storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) {
    throw new Error("Could not create a secure URL for the property photo.");
  }
  return data.signedUrl;
}

export async function listPropertyMedia(propertyId: string): Promise<PropertyMediaItem[]> {
  const response = await apiFetch<MediaListResponse>(
    `/api/properties/${encodeURIComponent(propertyId)}/media`,
  );

  return Promise.all(
    response.data.map(async (item) => ({
      ...item,
      url: await signedUrl(item.storagePath),
    })),
  );
}

export async function uploadPropertyImages(
  propertyId: string,
  files: readonly File[],
  startingOrder = 0,
): Promise<PropertyMediaItem[]> {
  if (files.length === 0) return [];

  const supabase = requireSupabase();
  const uploaded: PropertyMediaItem[] = [];

  for (const [index, file] of files.entries()) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`${file.name} is not an image.`);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${file.name} is larger than 15 MB.`);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
    const storagePath = `${propertyId}/${crypto.randomUUID()}-${safeName || "photo"}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw new Error(`Could not upload ${file.name}. ${uploadError.message}`);
    }

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
            displayOrder: startingOrder + index,
            isCover: startingOrder === 0 && index === 0,
            metadata: null,
          }),
        },
      );

      uploaded.push({
        ...response.data,
        url: await signedUrl(storagePath),
      });
    } catch (error) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw error;
    }
  }

  return uploaded;
}

export async function deletePropertyMedia(
  propertyId: string,
  media: Pick<PropertyMediaItem, "id" | "storagePath">,
): Promise<void> {
  await apiFetch<void>(
    `/api/properties/${encodeURIComponent(propertyId)}/media/${encodeURIComponent(media.id)}`,
    { method: "DELETE" },
  );
  const { error } = await requireSupabase().storage.from(BUCKET).remove([media.storagePath]);
  if (error) {
    throw new Error(`Photo record was removed, but the stored file could not be deleted: ${error.message}`);
  }
}

export async function setPropertyMediaCover(
  propertyId: string,
  mediaId: string,
  isCover: boolean,
): Promise<void> {
  await apiFetch<void>(
    `/api/properties/${encodeURIComponent(propertyId)}/media/${encodeURIComponent(mediaId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isCover }),
    },
  );
}
