import { ImagePlus, Star, Trash2, X } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  PROPERTY_CURRENCIES,
  PROPERTY_PURPOSES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type Property,
  type PropertyCurrency,
  type PropertyPurpose,
  type PropertyStatus,
  type PropertyType,
} from "../../../features/properties/property-data";

type PropertyEditorModalProps = {
  mode: "create" | "edit";
  property: Property;
  onClose: () => void;
  onSave: (property: Property) => boolean;
};

const MAX_PHOTOS = 6;
const MAX_SOURCE_SIZE = 15 * 1024 * 1024;
const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

function getLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberValue(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

async function compressImage(file: File): Promise<string> {
  const imageSource = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const imageElement = new Image();

    imageElement.onload = () => resolve(imageElement);
    imageElement.onerror = () => reject(new Error("Could not prepare image"));
    imageElement.src = imageSource;
  });

  const maxDimension = 900;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");

  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare image");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.7);
}

export function PropertyEditorModal({
  mode,
  property,
  onClose,
  onSave,
}: PropertyEditorModalProps) {
  const [form, setForm] = useState({
    title: property.title,
    district: property.district,
    location: property.location,
    purpose: property.purpose,
    status: property.status,
    propertyType: property.propertyType,
    price: property.price > 0 ? String(property.price) : "",
    currency: property.currency,
    bedrooms: property.bedrooms > 0 ? String(property.bedrooms) : "",
    bathrooms: property.bathrooms > 0 ? String(property.bathrooms) : "",
    areaSqm: property.areaSqm > 0 ? String(property.areaSqm) : "",
    ownerName: property.ownerName,
    ownerPhone: property.ownerPhone ?? "",
    description: property.description ?? "",
    features: (property.features ?? []).join("\n"),
  });
  const [images, setImages] = useState<string[]>(property.images ?? []);
  const [uploadError, setUploadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const isCreateMode = mode === "create";
  const modalTitle = isCreateMode ? "Add a property" : "Edit property";
  const saveLabel = isCreateMode ? "Create property" : "Save changes";

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isUploading) {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isUploading, onClose]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setSaveError("");
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const validFiles = selectedFiles.filter(
      (file) => file.type.startsWith("image/") && file.size <= MAX_SOURCE_SIZE,
    );
    const availableSlots = MAX_PHOTOS - images.length;

    if (availableSlots <= 0) {
      setUploadError(`You can add up to ${MAX_PHOTOS} photos per property.`);
      event.target.value = "";
      return;
    }

    if (validFiles.length === 0) {
      setUploadError(
        "Choose JPG, PNG, or WebP images smaller than 15 MB each.",
      );
      event.target.value = "";
      return;
    }

    setUploadError("");

    try {
      setIsUploading(true);

      const uploadedImages = await Promise.all(
        validFiles.slice(0, availableSlots).map(compressImage),
      );

      setImages((currentImages) => [...currentImages, ...uploadedImages]);

      if (validFiles.length !== selectedFiles.length) {
        setUploadError(
          "Some files were skipped. Use JPG, PNG, or WebP under 15 MB.",
        );
      } else if (validFiles.length > availableSlots) {
        setUploadError(
          `Only ${MAX_PHOTOS} photos can be saved for one property.`,
        );
      }
    } catch {
      setUploadError("One or more photos could not be uploaded. Try again.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function removePhoto(indexToRemove: number) {
    setImages((currentImages) =>
      currentImages.filter((_, index) => index !== indexToRemove),
    );
    setSaveError("");
  }

  function makeCover(indexToMove: number) {
    setImages((currentImages) => {
      const nextImages = [...currentImages];
      const [coverImage] = nextImages.splice(indexToMove, 1);
      return [coverImage, ...nextImages];
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploading) {
      setSaveError("Wait for the photos to finish preparing first.");
      return;
    }

    const now = new Date().toISOString();
    const wasSaved = onSave({
      ...property,
      title: form.title.trim() || "Untitled property",
      district: form.district.trim(),
      location: form.location.trim(),
      purpose: form.purpose as PropertyPurpose,
      status: form.status as PropertyStatus,
      propertyType: form.propertyType as PropertyType,
      price: numberValue(form.price),
      currency: form.currency as PropertyCurrency,
      bedrooms: numberValue(form.bedrooms),
      bathrooms: numberValue(form.bathrooms),
      areaSqm: numberValue(form.areaSqm),
      ownerName: form.ownerName.trim(),
      ownerPhone: form.ownerPhone.trim(),
      description: form.description.trim(),
      features: getLines(form.features),
      images,
      updatedLabel: isCreateMode ? "Added just now" : "Updated just now",
      createdAt: property.createdAt || now,
      updatedAt: now,
    });

    if (wasSaved) {
      onClose();
    } else {
      setSaveError(
        "The property could not be saved. Remove a few photos and try again.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex min-h-full max-w-5xl items-center">
        <form
          aria-labelledby="property-editor-title"
          aria-modal="true"
          role="dialog"
          onSubmit={handleSubmit}
          className="my-4 w-full overflow-hidden rounded-3xl bg-slate-50 shadow-2xl sm:my-6"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Property workspace
              </p>
              <h1
                id="property-editor-title"
                className="mt-1 text-xl font-bold text-slate-950"
              >
                {modalTitle}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {isCreateMode
                  ? "Create a complete listing that is ready to share."
                  : "Update the listing details and save them permanently."}
              </p>
            </div>

            <button
              aria-label="Close property editor"
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-100"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_0.9fr]">
            <section>
              <h2 className="text-base font-bold text-slate-950">
                Listing information
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Property title
                  </span>
                  <input
                    autoFocus
                    required
                    value={form.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    placeholder="Example: Modern villa in Empire World"
                    className={fieldClassName}
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    District
                  </span>
                  <input
                    required
                    value={form.district}
                    onChange={(event) =>
                      updateField("district", event.target.value)
                    }
                    placeholder="Empire World"
                    className={fieldClassName}
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Exact location
                  </span>
                  <input
                    required
                    value={form.location}
                    onChange={(event) =>
                      updateField("location", event.target.value)
                    }
                    placeholder="Street, building, or landmark"
                    className={fieldClassName}
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Purpose
                  </span>
                  <select
                    value={form.purpose}
                    onChange={(event) =>
                      updateField("purpose", event.target.value)
                    }
                    className={fieldClassName}
                  >
                    {PROPERTY_PURPOSES.map((purpose) => (
                      <option key={purpose} value={purpose}>
                        For {purpose.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Status
                  </span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    className={fieldClassName}
                  >
                    {PROPERTY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Property type
                  </span>
                  <select
                    value={form.propertyType}
                    onChange={(event) =>
                      updateField("propertyType", event.target.value)
                    }
                    className={fieldClassName}
                  >
                    {PROPERTY_TYPES.map((propertyType) => (
                      <option key={propertyType} value={propertyType}>
                        {propertyType}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Currency
                  </span>
                  <select
                    value={form.currency}
                    onChange={(event) =>
                      updateField("currency", event.target.value)
                    }
                    className={fieldClassName}
                  >
                    {PROPERTY_CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Price
                  </span>
                  <input
                    required
                    min="0"
                    type="number"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(event) =>
                      updateField("price", event.target.value)
                    }
                    placeholder="0"
                    className={fieldClassName}
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Bedrooms
                  </span>
                  <input
                    min="0"
                    type="number"
                    inputMode="numeric"
                    value={form.bedrooms}
                    onChange={(event) =>
                      updateField("bedrooms", event.target.value)
                    }
                    placeholder="0"
                    className={fieldClassName}
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Bathrooms
                  </span>
                  <input
                    min="0"
                    type="number"
                    inputMode="numeric"
                    value={form.bathrooms}
                    onChange={(event) =>
                      updateField("bathrooms", event.target.value)
                    }
                    placeholder="0"
                    className={fieldClassName}
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Area in m²
                  </span>
                  <input
                    required
                    min="0"
                    type="number"
                    inputMode="decimal"
                    value={form.areaSqm}
                    onChange={(event) =>
                      updateField("areaSqm", event.target.value)
                    }
                    placeholder="0"
                    className={fieldClassName}
                  />
                </label>
              </div>

              <h2 className="mt-8 text-base font-bold text-slate-950">
                Owner and listing details
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Owner name
                  </span>
                  <input
                    required
                    value={form.ownerName}
                    onChange={(event) =>
                      updateField("ownerName", event.target.value)
                    }
                    placeholder="Owner full name"
                    className={fieldClassName}
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Owner phone
                  </span>
                  <input
                    type="tel"
                    value={form.ownerPhone}
                    onChange={(event) =>
                      updateField("ownerPhone", event.target.value)
                    }
                    placeholder="+964 7XX XXX XXXX"
                    className={fieldClassName}
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Description
                  </span>
                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    placeholder="Write the important details of this property..."
                    className={`${fieldClassName} resize-y leading-6`}
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Features
                  </span>
                  <textarea
                    rows={4}
                    value={form.features}
                    onChange={(event) =>
                      updateField("features", event.target.value)
                    }
                    placeholder={`Private garden\n24/7 security\nGenerator backup`}
                    className={`${fieldClassName} resize-y leading-6`}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Write one feature on each line.
                  </p>
                </label>
              </div>
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:sticky lg:top-6">
              <div>
                <p className="text-base font-bold text-slate-950">
                  Property photos
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Upload up to {MAX_PHOTOS} photos. The first image is the
                  cover.
                </p>
              </div>

              <label className="mt-4 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400 focus-within:ring-4 focus-within:ring-amber-100">
                <ImagePlus aria-hidden="true" size={18} />
                {isUploading ? "Preparing photos..." : "Upload photos"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={isUploading || images.length >= MAX_PHOTOS}
                  onChange={handlePhotoUpload}
                  className="sr-only"
                />
              </label>

              {uploadError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                >
                  {uploadError}
                </p>
              )}

              {images.length > 0 ? (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {images.map((image, index) => (
                    <div
                      key={`${image.slice(0, 36)}-${index}`}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={image}
                        alt={`Property upload ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />

                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold text-white">
                          Cover
                        </span>
                      )}

                      <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1">
                        {index > 0 && (
                          <button
                            aria-label={`Make photo ${index + 1} the cover`}
                            title="Make cover"
                            type="button"
                            onClick={() => makeCover(index)}
                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-white/95 text-amber-700 shadow-sm transition hover:bg-amber-50"
                          >
                            <Star aria-hidden="true" size={16} />
                          </button>
                        )}

                        <button
                          aria-label={`Remove photo ${index + 1}`}
                          title="Remove photo"
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-white/95 text-rose-600 shadow-sm transition hover:bg-rose-50"
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                  <ImagePlus
                    aria-hidden="true"
                    className="mx-auto text-slate-400"
                    size={28}
                  />
                  <p className="mt-3 text-sm font-bold text-slate-700">
                    No photos uploaded yet
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Add the best outside photo first.
                  </p>
                </div>
              )}

              <p className="mt-4 text-xs font-medium text-slate-500">
                {images.length} of {MAX_PHOTOS} photos added
              </p>
            </aside>
          </div>

          {saveError && (
            <div
              role="alert"
              className="mx-5 mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 sm:mx-7"
            >
              {saveError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading}
              className="min-h-12 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isUploading ? "Preparing photos..." : saveLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
