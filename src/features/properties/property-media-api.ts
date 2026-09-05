import { apiFetch } from "../../lib/api";
import { requireSupabase } from "../../lib/supabase";

export const PROPERTY_MEDIA_BUCKET = "property-media";
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

function publicUrl(storagePath: string) {
  const { data } = requireSupabase().storage
    .from(PROPERTY_MEDIA_BUCKET)
    .getPublicUrl(storagePath);
  if (!data?.publicUrl) {
    throw new Error("Could not create a public URL for the property photo.");
  }
  return data.publicUrl;
}

export async function listPropertyMedia(propertyId: string): Promise<PropertyMediaItem[]> {
  const response = await apiFetch<MediaListResponse>(
    `/api/properties/${encodeURIComponent(propertyId)}/media`,
  );

  return response.data
    .filter((item) => item.deletedAt === null)
    .map((item) => ({
      ...item,
      url: publicUrl(item.storagePath),
    }))
    .sort((a, b) => {
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      return a.displayOrder - b.displayOrder;
    });
}

export async function uploadPropertyImages(
  propertyId: string,
  files: readonly File[],
  startingOrder = 0,
): Promise<PropertyMediaItem[]> {
  if (files.length === 0) return [];

  const supabase = requireSupabase();
  const uploaded: PropertyMediaItem[] = [];
  const hasExistingMedia = startingOrder > 0;

  for (const [index, file] of files.entries()) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`${file.name} is not an image.`);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${file.name} is larger than 15 MB.`);
    }

    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-");
    const storagePath = `${propertyId}/${crypto.randomUUID()}-${safeName || "photo"}`;

    const { error: uploadError } = await supabase.storage
      .from(PROPERTY_MEDIA_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      await supabase.storage.from(PROPERTY_MEDIA_BUCKET).remove([storagePath]);
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
            isCover: !hasExistingMedia && index === 0,
            metadata: null,
          }),
        },
      );

      uploaded.push({
        ...response.data,
        url: publicUrl(storagePath),
      });
    } catch (error) {
      await supabase.storage.from(PROPERTY_MEDIA_BUCKET).remove([storagePath]);
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
  const { error } = await requireSupabase()
    .storage.from(PROPERTY_MEDIA_BUCKET)
    .remove([media.storagePath]);
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
