import { ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import type { Property } from "../../../features/properties/property-data";
import { rememberPropertyImages } from "../../../features/properties/property-api";
import {
  deletePropertyMedia,
  listPropertyMedia,
  setPropertyMediaCover,
  uploadPropertyImages,
  type PropertyMediaItem,
} from "../../../features/properties/property-media-api";

type PropertyPhotoManagerProps = {
  property: Property;
  onClose: () => void;
};

const MAX_PHOTOS = 6;

export function PropertyPhotoManager({
  property,
  onClose,
}: PropertyPhotoManagerProps) {
  const [media, setMedia] = useState<PropertyMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setIsLoading(true);
    setError("");
    try {
      const nextMedia = await listPropertyMedia(property.id);
      setMedia(nextMedia);
      rememberPropertyImages(
        property.id,
        nextMedia
          .filter((item) => item.mimeType.startsWith("image/") && item.url)
          .sort((a, b) => {
            if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
            return a.displayOrder - b.displayOrder;
          })
          .map((item) => item.url),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load photos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [property.id]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const availableSlots = MAX_PHOTOS - media.length;
    if (availableSlots <= 0) {
      setError(`A property can have up to ${MAX_PHOTOS} photos.`);
      return;
    }

    setIsUploading(true);
    setError("");
    try {
      await uploadPropertyImages(
        property.id,
        files.slice(0, availableSlots),
        media.length,
      );
      await refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload photos.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(item: PropertyMediaItem) {
    setError("");
    try {
      await deletePropertyMedia(property.id, item);
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete photo.");
    }
  }

  async function handleCover(item: PropertyMediaItem) {
    setError("");
    try {
      await Promise.all(
        media
          .filter((candidate) => candidate.id !== item.id && candidate.isCover)
          .map((candidate) => setPropertyMediaCover(property.id, candidate.id, false)),
      );
      await setPropertyMediaCover(property.id, item.id, true);
      await refresh();
    } catch (coverError) {
      setError(coverError instanceof Error ? coverError.message : "Could not set cover photo.");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-4xl items-center">
        <section className="my-6 w-full overflow-hidden rounded-3xl bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Property photos
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">{property.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Photos are stored securely in Supabase Storage and remain available after refresh.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              aria-label="Close photo manager"
            >
              <X size={20} />
            </button>
          </header>

          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">
                {media.length} / {MAX_PHOTOS} photos
              </p>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                {isUploading ? <Loader2 className="animate-spin" size={18} /> : <ImagePlus size={18} />}
                {isUploading ? "Uploading…" : "Upload photos"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  disabled={isUploading || media.length >= MAX_PHOTOS}
                  onChange={handleUpload}
                  className="sr-only"
                />
              </label>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center text-slate-500">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : media.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <ImagePlus className="mx-auto text-slate-400" size={32} />
                <p className="mt-3 font-semibold text-slate-700">No property photos yet</p>
                <p className="mt-1 text-sm text-slate-500">Upload the listing photos you want your team to use.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {media.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                      <img src={item.url} alt={item.fileName} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-700">{item.fileName}</p>
                        {item.isCover ? <p className="mt-1 text-[11px] font-bold text-amber-700">Cover photo</p> : null}
                      </div>
                      <div className="flex items-center gap-1">
                        {!item.isCover ? (
                          <button
                            type="button"
                            onClick={() => void handleCover(item)}
                            title="Set as cover"
                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-amber-600"
                          >
                            <Star size={16} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          title="Delete photo"
                          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
