import {
  CalendarPlus,
  Check,
  MessageCircle,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { ScheduleViewingModal } from "../components/dashboard/clients/ScheduleViewingModal";
import {
  createActivity,
  loadActivities,
  saveActivities,
} from "../features/activities/activity-storage";
import type { ClientPurpose } from "../features/clients/client-data";
import { loadClients } from "../features/clients/client-storage";
import { getAllSmartMatches } from "../features/matching/matching";
import { loadProperties } from "../features/properties/property-storage";
import { formatPropertyPrice } from "../features/properties/property-utils";
import type { ViewingDraft } from "../features/viewings/viewing-data";
import {
  createViewing,
  loadViewings,
  saveViewings,
} from "../features/viewings/viewing-storage";
import { createPropertyShareMessage, createWhatsAppUrl } from "../lib/whatsapp";

type SchedulePair = {
  clientId: string;
  propertyId: string;
};

const strengthStyles = {
  Excellent: "bg-emerald-50 text-emerald-700",
  Strong: "bg-sky-50 text-sky-700",
  Possible: "bg-amber-50 text-amber-800",
  Low: "bg-slate-100 text-slate-600",
} as const;

export function SmartMatchesPage() {
  const [clients] = useState(loadClients);
  const [properties] = useState(loadProperties);
  const [viewings, setViewings] = useState(() => loadViewings(properties));
  const [activities, setActivities] = useState(loadActivities);
  const [search, setSearch] = useState("");
  const [purpose, setPurpose] = useState<"All" | ClientPurpose>("All");
  const [minimumScore, setMinimumScore] = useState(50);
  const [schedulePair, setSchedulePair] = useState<SchedulePair | null>(null);
  const [storageError, setStorageError] = useState("");

  const allMatches = useMemo(
    () => getAllSmartMatches(clients, properties),
    [clients, properties],
  );
  const filteredMatches = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return allMatches.filter((match) => {
      const matchesPurpose =
        purpose === "All" || match.client.purpose === purpose;
      const matchesScore = match.score >= minimumScore;
      const matchesSearch =
        searchTerm.length === 0 ||
        [
          match.client.name,
          match.client.phone,
          match.property.title,
          match.property.district,
          match.property.propertyType,
        ].some((value) => value.toLowerCase().includes(searchTerm));

      return matchesPurpose && matchesScore && matchesSearch;
    });
  }, [allMatches, minimumScore, purpose, search]);

  const matchedClientIds = new Set(
    allMatches
      .filter((match) => match.score >= 70)
      .map((match) => match.client.id),
  );
  const excellentMatches = allMatches.filter(
    (match) => match.score >= 85,
  ).length;
  const unmatchedClients = clients.length - matchedClientIds.size;
  const schedulingClient = schedulePair
    ? clients.find((client) => client.id === schedulePair.clientId)
    : undefined;

  function scheduleViewing(draft: ViewingDraft) {
    const viewing = createViewing(draft, viewings);
    const nextViewings = [viewing, ...viewings];
    const property = properties.find(
      (candidate) => candidate.id === viewing.propertyId,
    );

    if (!saveViewings(nextViewings)) {
      setStorageError("This viewing could not be saved. Please try again.");
      return;
    }

    const nextActivities = [
      createActivity({
        clientId: viewing.clientId,
        propertyId: viewing.propertyId,
        viewingId: viewing.id,
        type: "Viewing",
        text: `Viewing scheduled from Smart Matches for ${
          property?.title ?? "property"
        } on ${viewing.date} at ${viewing.time}.`,
      }),
      ...activities,
    ];

    saveActivities(nextActivities);
    setActivities(nextActivities);
    setViewings(nextViewings);
    setSchedulePair(null);
    setStorageError("");
  }

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">
            MATCHING ENGINE
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Smart Matches
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            EstateFlow compares every available property with every client using
            purpose, budget, area, property type, and bedrooms—then explains the
            result.
          </p>
        </div>
      </section>

      {storageError && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          {storageError}
        </p>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Live pairs", allMatches.length, "Available scored matches"],
          ["Excellent", excellentMatches, "85% score or higher"],
          ["Matched clients", matchedClientIds.size, "At least one 70%+ fit"],
          ["Need listings", unmatchedClients, "No strong match yet"],
        ].map(([label, value, detail]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
            <p className="mt-2 text-sm font-medium text-slate-500">{detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <label className="relative">
            <span className="text-sm font-semibold text-slate-700">
              Search matches
            </span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3.5 left-4 text-slate-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Client, property, area, or type..."
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm text-slate-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Client purpose
            </span>
            <select
              value={purpose}
              onChange={(event) =>
                setPurpose(event.target.value as "All" | ClientPurpose)
              }
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            >
              <option value="All">Buy and rent</option>
              <option value="Buy">Buy</option>
              <option value="Rent">Rent</option>
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Minimum score
            </span>
            <select
              value={minimumScore}
              onChange={(event) => setMinimumScore(Number(event.target.value))}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            >
              <option value="50">50% · Possible</option>
              <option value="70">70% · Strong</option>
              <option value="85">85% · Excellent</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6">
        <p className="text-sm font-medium text-slate-500">
          Showing{" "}
          <span className="font-bold text-slate-950">
            {filteredMatches.length}
          </span>{" "}
          matching pairs
        </p>

        {filteredMatches.length > 0 && (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {filteredMatches.map((match) => (
              <article
                key={`${match.client.id}-${match.property.id}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="grid sm:grid-cols-[0.72fr_1fr]">
                  {match.property.images?.[0] ? (
                    <img
                      src={match.property.images[0]}
                      alt={match.property.title}
                      className="h-52 w-full object-cover sm:h-full"
                    />
                  ) : (
                    <div className="flex min-h-44 items-end bg-gradient-to-br from-slate-950 via-slate-800 to-amber-700 p-5">
                      <p className="font-bold text-white">
                        {match.property.propertyType} in{" "}
                        {match.property.district}
                      </p>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                          {match.client.name}
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-slate-950">
                          {match.property.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {match.property.district} ·{" "}
                          {match.property.propertyType}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-xl px-3 py-2 text-center ${strengthStyles[match.strength]}`}
                      >
                        <span className="block text-[10px] font-bold uppercase">
                          {match.strength}
                        </span>
                        <span className="text-xl font-bold">
                          {match.score}%
                        </span>
                      </span>
                    </div>

                    <p className="mt-4 text-xl font-bold text-slate-950">
                      {formatPropertyPrice(
                        match.property.price,
                        match.property.currency,
                      )}
                      {match.property.purpose === "Rent" && (
                        <span className="text-sm font-medium text-slate-500">
                          {" "}
                          / month
                        </span>
                      )}
                    </p>

                    <div className="mt-4 grid gap-2">
                      {match.criteria.map((criterion) => (
                        <div
                          key={criterion.key}
                          title={criterion.detail}
                          className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            {criterion.matched ? (
                              <Check
                                aria-hidden="true"
                                className="text-emerald-600"
                                size={15}
                              />
                            ) : (
                              <XCircle
                                aria-hidden="true"
                                className="text-slate-400"
                                size={15}
                              />
                            )}
                            {criterion.label}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {criterion.earned}/{criterion.possible}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-2">
                      <a
                        href={createWhatsAppUrl(
                          match.client.phone,
                          createPropertyShareMessage(
                            match.property,
                            match.client,
                          ),
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white transition hover:bg-emerald-500"
                      >
                        <MessageCircle aria-hidden="true" size={16} />
                        Share with client
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          setSchedulePair({
                            clientId: match.client.id,
                            propertyId: match.property.id,
                          })
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        <CalendarPlus aria-hidden="true" size={16} />
                        Schedule viewing
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {filteredMatches.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Sparkles
              aria-hidden="true"
              className="mx-auto text-slate-400"
              size={32}
            />
            <p className="mt-4 text-lg font-bold text-slate-950">
              No matches at this score
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Lower the minimum score, change the search, or add more suitable
              listings.
            </p>
          </div>
        )}
      </section>

      {schedulePair && schedulingClient && (
        <ScheduleViewingModal
          client={schedulingClient}
          properties={properties}
          initialPropertyId={schedulePair.propertyId}
          onClose={() => setSchedulePair(null)}
          onSchedule={scheduleViewing}
        />
      )}
    </DashboardShell>
  );
}
