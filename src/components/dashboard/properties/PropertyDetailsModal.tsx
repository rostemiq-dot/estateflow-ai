import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Activity } from "../../../features/activities/activity-data";
import { getActivitiesForProperty } from "../../../features/activities/activity-storage";
import type { Client } from "../../../features/clients/client-data";
import { getMatchesForProperty } from "../../../features/matching/matching";
import type {
  Property,
  PropertyStatus,
} from "../../../features/properties/property-data";
import {
  formatPropertyDate,
  formatPropertyPrice,
} from "../../../features/properties/property-utils";
import type { Viewing } from "../../../features/viewings/viewing-data";
import {
  formatViewingDate,
  formatViewingTime,
  getViewingsForProperty,
} from "../../../features/viewings/viewing-utils";
import {
  createPropertyShareMessage,
  createWhatsAppUrl,
} from "../../../lib/whatsapp";

type PropertyDetailsModalProps = {
  property: Property;
  clients: readonly Client[];
  viewings: readonly Viewing[];
  activities: readonly Activity[];
  onClose: () => void;
  onStatusChange: (status: PropertyStatus) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const statusStyles: Record<PropertyStatus, string> = {
  Available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Reserved: "bg-amber-50 text-amber-700 ring-amber-600/20",
  "Under offer": "bg-violet-50 text-violet-700 ring-violet-600/20",
  Sold: "bg-slate-100 text-slate-600 ring-slate-600/20",
  Rented: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

const strengthStyles = {
  Excellent: "bg-emerald-50 text-emerald-700",
  Strong: "bg-sky-50 text-sky-700",
  Possible: "bg-amber-50 text-amber-800",
  Low: "bg-slate-100 text-slate-600",
} as const;

const activityStyles: Record<Activity["type"], string> = {
  Call: "bg-sky-50 text-sky-700",
  WhatsApp: "bg-emerald-50 text-emerald-700",
  Meeting: "bg-violet-50 text-violet-700",
  General: "bg-amber-50 text-amber-800",
  Viewing: "bg-cyan-50 text-cyan-700",
  Outcome: "bg-fuchsia-50 text-fuchsia-700",
};

function getDefaultFeatures(property: Property) {
  const sharedFeatures = [
    "24/7 security",
    "Private parking",
    "Generator backup",
    "Water supply",
  ];

  if (property.propertyType === "Villa" || property.propertyType === "House") {
    return ["Private garden", "Family living space", ...sharedFeatures];
  }

  if (property.propertyType === "Apartment") {
    return ["Elevator access", "Building reception", ...sharedFeatures];
  }

  if (property.propertyType === "Commercial") {
    return [
      "High visibility location",
      "Suitable for business",
      ...sharedFeatures,
    ];
  }

  return sharedFeatures;
}

function formatActivityDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function PropertyDetailsModal({
  property,
  clients,
  viewings,
  activities,
  onClose,
  onStatusChange,
  onEdit,
  onDuplicate,
  onDelete,
}: PropertyDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<
    "Overview" | "Matches" | "Activity"
  >("Overview");
  const [activeImage, setActiveImage] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const images = property.images ?? [];
  const safeActiveImage =
    images.length === 0 ? 0 : Math.min(activeImage, images.length - 1);
  const features =
    property.features && property.features.length > 0
      ? property.features
      : getDefaultFeatures(property);
  const matches = getMatchesForProperty(property, clients, true);
  const propertyViewings = getViewingsForProperty(viewings, property.id);
  const propertyActivities = getActivitiesForProperty(activities, property.id);
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const bestMatchScore = matches[0]?.score ?? 0;

  const listingText = `${property.title}
${property.purpose === "Sale" ? "For sale" : "For rent"} · ${formatPropertyPrice(
    property.price,
    property.currency,
  )}
${property.district}, ${property.location}
${property.bedrooms} bedrooms · ${property.bathrooms} bathrooms · ${
    property.areaSqm
  } m²`;

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function showPreviousImage() {
    setActiveImage((currentImage) =>
      currentImage === 0 ? images.length - 1 : currentImage - 1,
    );
  }

  function showNextImage() {
    setActiveImage((currentImage) =>
      currentImage === images.length - 1 ? 0 : currentImage + 1,
    );
  }

  async function copyListing() {
    try {
      await navigator.clipboard.writeText(listingText);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2200);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto min-h-full max-w-6xl">
        <div
          aria-labelledby="property-details-title"
          aria-modal="true"
          role="dialog"
          className="overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Property profile
              </p>
              <p className="mt-1 truncate text-sm font-medium text-slate-500">
                {property.id} · Last updated{" "}
                {formatPropertyDate(property.updatedAt)}
              </p>
            </div>

            <button
              aria-label="Close property details"
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>

          <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
            <section className="min-w-0 p-5 sm:p-7">
              <div className="relative overflow-hidden rounded-2xl bg-slate-900">
                {images.length > 0 ? (
                  <img
                    src={images[safeActiveImage]}
                    alt={property.title}
                    className="h-64 w-full object-cover sm:h-[390px]"
                  />
                ) : (
                  <div className="flex h-64 w-full flex-col justify-end bg-gradient-to-br from-slate-950 via-slate-800 to-amber-700 p-6 sm:h-[390px]">
                    <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                      Add photos from Edit Property
                    </span>
                    <p className="mt-4 text-2xl font-bold text-white">
                      {property.propertyType} in {property.district}
                    </p>
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button
                      aria-label="Show previous property photo"
                      type="button"
                      onClick={showPreviousImage}
                      className="absolute left-3 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-lg backdrop-blur transition hover:bg-white"
                    >
                      <ChevronLeft aria-hidden="true" size={22} />
                    </button>
                    <button
                      aria-label="Show next property photo"
                      type="button"
                      onClick={showNextImage}
                      className="absolute right-3 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-lg backdrop-blur transition hover:bg-white"
                    >
                      <ChevronRight aria-hidden="true" size={22} />
                    </button>
                    <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                      {safeActiveImage + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                  {images.map((image, index) => (
                    <button
                      key={`${image.slice(0, 40)}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${
                        safeActiveImage === index
                          ? "border-amber-500"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${property.title} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                      For {property.purpose.toLowerCase()}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[property.status]}`}
                    >
                      {property.status}
                    </span>
                  </div>

                  <h1
                    id="property-details-title"
                    className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                  >
                    {property.title}
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    {property.district} · {property.location}
                  </p>
                </div>

                <div className="shrink-0 sm:text-right">
                  <p className="text-2xl font-bold text-slate-950">
                    {formatPropertyPrice(property.price, property.currency)}
                  </p>
                  {property.purpose === "Rent" && (
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Per month
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-7 flex gap-1 overflow-x-auto border-b border-slate-200">
                {(["Overview", "Matches", "Activity"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${
                      activeTab === tab
                        ? "border-amber-500 text-slate-950"
                        : "border-transparent text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    {tab === "Matches"
                      ? `Smart matches (${matches.length})`
                      : tab === "Activity"
                        ? `Activity (${propertyActivities.length})`
                        : tab}
                  </button>
                ))}
              </div>

              {activeTab === "Overview" && (
                <div className="pt-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Bedrooms", property.bedrooms || "—"],
                      ["Bathrooms", property.bathrooms],
                      ["Property area", `${property.areaSqm} m²`],
                      ["Property type", property.propertyType],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <p className="text-lg font-bold text-slate-950">
                          {value}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7">
                    <h2 className="text-lg font-bold text-slate-950">
                      About this property
                    </h2>
                    <p className="mt-3 leading-7 text-slate-600">
                      {property.description ||
                        `A well-positioned ${property.propertyType.toLowerCase()} in ${
                          property.district
                        }, ready for the right ${
                          property.purpose === "Sale" ? "buyer" : "tenant"
                        }.`}
                    </p>
                  </div>

                  <div className="mt-7">
                    <h2 className="text-lg font-bold text-slate-950">
                      Key features
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {features.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
                        >
                          ✓ {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Matches" && (
                <div className="pt-6">
                  {matches.length > 0 ? (
                    <div className="space-y-4">
                      {matches.map((match) => (
                        <article
                          key={match.client.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 font-bold text-amber-800">
                                {match.client.name.charAt(0)}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-400">
                                  {match.client.id} · {match.client.stage}
                                </p>
                                <h3 className="mt-1 truncate text-lg font-bold text-slate-950">
                                  {match.client.name}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                  {match.client.phone}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`w-fit shrink-0 rounded-xl px-3 py-2 text-center ${strengthStyles[match.strength]}`}
                            >
                              <span className="block text-[10px] font-bold uppercase">
                                {match.strength}
                              </span>
                              <span className="text-xl font-bold">
                                {match.score}%
                              </span>
                            </span>
                          </div>

                          <details className="group mt-4 rounded-xl bg-slate-50">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold text-slate-700">
                              Score explanation
                              <ChevronDown
                                aria-hidden="true"
                                className="transition group-open:rotate-180"
                                size={17}
                              />
                            </summary>
                            <div className="space-y-3 border-t border-slate-200 p-4">
                              {match.criteria.map((criterion) => (
                                <div
                                  key={criterion.key}
                                  className="flex items-start gap-3"
                                >
                                  {criterion.matched ? (
                                    <Check
                                      aria-hidden="true"
                                      className="mt-0.5 shrink-0 text-emerald-600"
                                      size={17}
                                    />
                                  ) : (
                                    <XCircle
                                      aria-hidden="true"
                                      className="mt-0.5 shrink-0 text-slate-400"
                                      size={17}
                                    />
                                  )}
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">
                                      {criterion.label} · {criterion.earned}/
                                      {criterion.possible}
                                    </p>
                                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                                      {criterion.detail}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>

                          <a
                            href={createWhatsAppUrl(
                              match.client.phone,
                              createPropertyShareMessage(
                                property,
                                match.client,
                              ),
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500"
                          >
                            <MessageCircle aria-hidden="true" size={17} />
                            Share with {match.client.name}
                          </a>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <p className="font-bold text-slate-950">
                        No saved clients yet
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Add client requirements and EstateFlow will score them
                        against this property automatically.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Activity" && (
                <div className="pt-6">
                  {propertyActivities.length > 0 ? (
                    <div className="space-y-3">
                      {propertyActivities.map((activity) => {
                        const client = clientById.get(activity.clientId);

                        return (
                          <article
                            key={activity.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${activityStyles[activity.type]}`}
                              >
                                {activity.type}
                              </span>
                              <p className="text-xs font-medium text-slate-400">
                                {formatActivityDate(activity.createdAt)}
                              </p>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-700">
                              {activity.text}
                            </p>
                            {client && (
                              <p className="mt-2 text-xs font-semibold text-amber-700">
                                Client: {client.name}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <p className="font-bold text-slate-950">
                        No linked activity yet
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Notes, messages, scheduled viewings, and outcomes linked
                        to this property will appear here.
                      </p>
                    </div>
                  )}

                  {propertyViewings.length > 0 && (
                    <div className="mt-6">
                      <h2 className="font-bold text-slate-950">
                        Viewing history
                      </h2>
                      <div className="mt-3 space-y-3">
                        {propertyViewings.map((viewing) => (
                          <article
                            key={viewing.id}
                            className="rounded-xl bg-white p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-slate-950">
                                  {clientById.get(viewing.clientId)?.name ??
                                    "Client unavailable"}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {formatViewingDate(viewing.date)} at{" "}
                                  {formatViewingTime(viewing.time)}
                                </p>
                              </div>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                                {viewing.outcome ?? viewing.status}
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="border-t border-slate-200 bg-white p-5 sm:p-7 lg:border-l lg:border-t-0">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
                >
                  <Pencil aria-hidden="true" size={17} />
                  Edit property
                </button>
                <button
                  type="button"
                  onClick={onDuplicate}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Copy aria-hidden="true" size={17} />
                  Duplicate property
                </button>
                <a
                  href={createWhatsAppUrl(
                    "",
                    createPropertyShareMessage(property),
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500"
                >
                  <MessageCircle aria-hidden="true" size={17} />
                  Share on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={copyListing}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <Copy aria-hidden="true" size={17} />
                  {isCopied ? "Listing copied ✓" : "Copy listing details"}
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${property.district}, ${property.location}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <MapPin aria-hidden="true" size={17} />
                  Open location
                </a>
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 aria-hidden="true" size={17} />
                  Delete property
                </button>
              </div>

              <section className="mt-7 rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Listing status
                </p>
                <select
                  value={property.status}
                  onChange={(event) =>
                    onStatusChange(event.target.value as PropertyStatus)
                  }
                  className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                >
                  <option value="Available">Available</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Under offer">Under offer</option>
                  <option value="Sold">Sold</option>
                  <option value="Rented">Rented</option>
                </select>
              </section>

              <section className="mt-5 rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Owner
                </p>
                <p className="mt-3 text-lg font-bold text-slate-950">
                  {property.ownerName}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {property.ownerPhone || "Phone number not added yet"}
                </p>
                {property.ownerPhone && (
                  <a
                    href={`tel:${property.ownerPhone.replace(/\s/g, "")}`}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-100 px-3 text-sm font-bold text-amber-900 transition hover:bg-amber-200"
                  >
                    <Phone aria-hidden="true" size={16} />
                    Call owner
                  </a>
                )}
              </section>

              <section className="mt-5 rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Live performance
                </p>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Best match</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {bestMatchScore}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Matching clients
                    </span>
                    <span className="text-sm font-bold text-slate-950">
                      {matches.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Saved viewings
                    </span>
                    <span className="text-sm font-bold text-slate-950">
                      {propertyViewings.length}
                    </span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
