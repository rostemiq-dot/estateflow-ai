import {
  CalendarCheck,
  CalendarPlus,
  Check,
  Clock,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { ScheduleViewingModal } from "../components/dashboard/clients/ScheduleViewingModal";
import { ViewingOutcomeModal } from "../components/dashboard/viewings/ViewingOutcomeModal";
import {
  createActivity,
  loadActivities,
  saveActivities,
} from "../features/activities/activity-storage";
import { loadClients } from "../features/clients/client-storage";
import {
  listPropertiesFromDatabase,
} from "../features/properties/property-api";
import type { Property } from "../features/properties/property-data";
import {
  VIEWING_STATUSES,
  type Viewing,
  type ViewingDraft,
  type ViewingOutcome,
  type ViewingStatus,
} from "../features/viewings/viewing-data";
import {
  createViewing,
  loadViewings,
  saveViewings,
} from "../features/viewings/viewing-storage";
import {
  formatViewingDate,
  formatViewingTime,
  getUpcomingViewings,
  getViewingTimestamp,
  isViewingToday,
} from "../features/viewings/viewing-utils";
import { createWhatsAppUrl } from "../lib/whatsapp";

type ViewingFilter = "All" | "Upcoming" | ViewingStatus;

const statusStyles: Record<ViewingStatus, string> = {
  Scheduled: "bg-amber-50 text-amber-800",
  Confirmed: "bg-emerald-50 text-emerald-700",
  Completed: "bg-slate-100 text-slate-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

function createReminderMessage(
  clientName: string,
  propertyTitle: string,
  viewing: Viewing,
) {
  return `Hello ${clientName}, this is a reminder for your property viewing:

${propertyTitle}
${formatViewingDate(viewing.date)} at ${formatViewingTime(viewing.time)}
${viewing.location ? `Meeting point: ${viewing.location}` : ""}

Please let me know if the time still works for you.`;
}

export function ViewingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients] = useState(loadClients);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [viewings, setViewings] = useState(() => loadViewings(properties));
  const [activities, setActivities] = useState(loadActivities);
  const [filter, setFilter] = useState<ViewingFilter>("Upcoming");
  const [search, setSearch] = useState("");
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);
  const [pickerClientId, setPickerClientId] = useState(clients[0]?.id ?? "");
  const [scheduleClientId, setScheduleClientId] = useState<string | null>(null);
  const [outcomeViewingId, setOutcomeViewingId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let active = true;

    setIsLoadingProperties(true);
    void listPropertiesFromDatabase()
      .then((nextProperties) => {
        if (!active) return;
        setProperties(nextProperties);
      })
      .catch((error) => {
        if (!active) return;
        setStorageError(
          error instanceof Error
            ? error.message
            : "Could not load properties from the database.",
        );
        setProperties([]);
      })
      .finally(() => {
        if (active) setIsLoadingProperties(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const propertyById = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );
  const filteredViewings = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const now = new Date();

    return [...viewings]
      .filter((viewing) => {
        const client = clientById.get(viewing.clientId);
        const property = propertyById.get(viewing.propertyId);
        const matchesSearch =
          searchTerm.length === 0 ||
          [
            viewing.id,
            client?.name ?? "",
            client?.phone ?? "",
            property?.title ?? "",
            property?.district ?? "",
          ].some((value) => value.toLowerCase().includes(searchTerm));
        const matchesFilter =
          filter === "All" ||
          (filter === "Upcoming"
            ? viewing.status !== "Completed" &&
              viewing.status !== "Cancelled" &&
              getViewingTimestamp(viewing) >= now.getTime()
            : viewing.status === filter);

        return matchesSearch && matchesFilter;
      })
      .sort((first, second) => {
        const firstTime = getViewingTimestamp(first);
        const secondTime = getViewingTimestamp(second);
        const nowTime = now.getTime();
        const firstIsPast = firstTime < nowTime;
        const secondIsPast = secondTime < nowTime;

        if (firstIsPast !== secondIsPast) {
          return firstIsPast ? 1 : -1;
        }

        return firstTime - secondTime;
      });
  }, [clientById, filter, propertyById, search, viewings]);

  const groupedViewings = useMemo(() => {
    const groups = new Map<string, Viewing[]>();

    filteredViewings.forEach((viewing) => {
      const currentGroup = groups.get(viewing.date) ?? [];
      groups.set(viewing.date, [...currentGroup, viewing]);
    });

    return [...groups.entries()];
  }, [filteredViewings]);

  const todayCount = viewings.filter(
    (viewing) =>
      isViewingToday(viewing) &&
      viewing.status !== "Cancelled" &&
      viewing.status !== "Completed",
  ).length;
  const upcomingCount = getUpcomingViewings(viewings).length;
  const confirmedCount = viewings.filter(
    (viewing) => viewing.status === "Confirmed",
  ).length;
  const completedCount = viewings.filter(
    (viewing) => viewing.status === "Completed",
  ).length;
  const schedulingClient = scheduleClientId
    ? clientById.get(scheduleClientId)
    : undefined;
  const outcomeViewing = outcomeViewingId
    ? viewings.find((viewing) => viewing.id === outcomeViewingId)
    : undefined;

  function persistViewings(nextViewings: Viewing[]) {
    if (!saveViewings(nextViewings)) {
      setStorageError(
        "This viewing change could not be saved. Please try again.",
      );
      return false;
    }

    setViewings(nextViewings);
    setStorageError("");
    return true;
  }

  function addActivity(draft: Parameters<typeof createActivity>[0]) {
    const nextActivities = [createActivity(draft), ...activities];

    if (saveActivities(nextActivities)) {
      setActivities(nextActivities);
      return;
    }

    setStorageError("The viewing was saved, but its activity note was not.");
  }

  function scheduleViewing(draft: ViewingDraft) {
    const viewing = createViewing(draft, viewings);
    const property = propertyById.get(viewing.propertyId);

    if (persistViewings([viewing, ...viewings])) {
      addActivity({
        clientId: viewing.clientId,
        propertyId: viewing.propertyId,
        viewingId: viewing.id,
        type: "Viewing",
        text: `Viewing scheduled for ${property?.title ?? "property"} on ${
          viewing.date
        } at ${viewing.time}.`,
      });
      setScheduleClientId(null);
    }
  }

  function updateStatus(viewing: Viewing, status: ViewingStatus) {
    const updatedViewing: Viewing = {
      ...viewing,
      status,
      updatedAt: new Date().toISOString(),
    };
    const nextViewings = viewings.map((candidate) =>
      candidate.id === viewing.id ? updatedViewing : candidate,
    );
    const property = propertyById.get(viewing.propertyId);

    if (persistViewings(nextViewings)) {
      addActivity({
        clientId: viewing.clientId,
        propertyId: viewing.propertyId,
        viewingId: viewing.id,
        type: "Viewing",
        text: `${property?.title ?? "Property"} viewing marked ${status.toLowerCase()}.`,
      });
    }
  }

  function saveOutcome(
    viewing: Viewing,
    outcome: ViewingOutcome,
    notes: string,
  ) {
    const updatedViewing: Viewing = {
      ...viewing,
      status: "Completed",
      outcome,
      outcomeNotes: notes,
      updatedAt: new Date().toISOString(),
    };
    const nextViewings = viewings.map((candidate) =>
      candidate.id === viewing.id ? updatedViewing : candidate,
    );
    const property = propertyById.get(viewing.propertyId);

    if (persistViewings(nextViewings)) {
      addActivity({
        clientId: viewing.clientId,
        propertyId: viewing.propertyId,
        viewingId: viewing.id,
        type: "Outcome",
        text: `${property?.title ?? "Property"} viewing outcome: ${outcome}.${
          notes ? ` ${notes}` : ""
        }`,
      });
      setOutcomeViewingId(null);
    }
  }

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">
            SHARED CALENDAR
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Viewings
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Organize property visits, send reminders, and save every outcome
            back to both the client and property timeline.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsClientPickerOpen(true)}
          disabled={clients.length === 0 || isLoadingProperties}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <CalendarPlus aria-hidden="true" size={18} />
          Schedule viewing
        </button>
      </section>

      {storageError && (
        <div
          role="alert"
          className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          <p>{storageError}</p>
          <button
            aria-label="Dismiss storage warning"
            type="button"
            onClick={() => setStorageError("")}
            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg hover:bg-rose-100"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Today", todayCount, "Visits due today", "text-amber-700"],
          ["Upcoming", upcomingCount, "Future active visits", "text-sky-700"],
          [
            "Confirmed",
            confirmedCount,
            "Clients have confirmed",
            "text-emerald-700",
          ],
          ["Completed", completedCount, "Outcomes recorded", "text-slate-600"],
        ].map(([label, value, detail, detailClass]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
            <p className={`mt-2 text-sm font-medium ${detailClass}`}>
              {detail}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <label className="relative">
            <span className="text-sm font-semibold text-slate-700">
              Search calendar
            </span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3.5 left-4 text-slate-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Client, phone, property, district..."
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Calendar view
            </span>
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as ViewingFilter)
              }
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            >
              <option value="Upcoming">Upcoming</option>
              <option value="All">All viewings</option>
              {VIEWING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6 space-y-6">
        {groupedViewings.map(([date, dateViewings]) => (
          <div key={date}>
            <div className="flex items-center gap-3">
              <CalendarCheck
                aria-hidden="true"
                className="text-amber-700"
                size={20}
              />
              <h2 className="font-bold text-slate-950">
                {formatViewingDate(date)}
              </h2>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
                {dateViewings.length}
              </span>
            </div>

            <div className="mt-3 grid gap-4 xl:grid-cols-2">
              {dateViewings.map((viewing) => {
                const client = clientById.get(viewing.clientId);
                const property = propertyById.get(viewing.propertyId);

                return (
                  <article
                    key={viewing.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                          <Clock aria-hidden="true" size={19} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-slate-950">
                            {formatViewingTime(viewing.time)}
                          </p>
                          <p className="mt-1 truncate font-semibold text-slate-800">
                            {property?.title ?? "Property unavailable"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {property?.district ?? viewing.location}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[viewing.status]}`}
                      >
                        {viewing.outcome ?? viewing.status}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <p className="font-bold text-slate-950">
                        {client?.name ?? "Client unavailable"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {client?.phone ?? "Phone unavailable"}
                      </p>
                      {viewing.location && (
                        <p className="mt-2 text-xs text-slate-500">
                          Meeting point: {viewing.location}
                        </p>
                      )}
                    </div>

                    {viewing.outcomeNotes && (
                      <p className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-800">
                        {viewing.outcomeNotes}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {client && property && viewing.status !== "Cancelled" && (
                        <a
                          href={createWhatsAppUrl(
                            client.phone,
                            createReminderMessage(
                              client.name,
                              property.title,
                              viewing,
                            ),
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white transition hover:bg-emerald-500"
                        >
                          <MessageCircle aria-hidden="true" size={16} />
                          Send reminder
                        </a>
                      )}

                      {viewing.status === "Scheduled" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(viewing, "Confirmed")}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                        >
                          <Check aria-hidden="true" size={16} />
                          Confirm
                        </button>
                      )}

                      {(viewing.status === "Scheduled" ||
                        viewing.status === "Confirmed") && (
                        <>
                          <button
                            type="button"
                            onClick={() => setOutcomeViewingId(viewing.id)}
                            className="min-h-11 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-slate-800"
                          >
                            Complete & outcome
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(viewing, "Cancelled")}
                            className="min-h-11 rounded-xl px-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}

        {filteredViewings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <CalendarCheck
              aria-hidden="true"
              className="mx-auto text-slate-400"
              size={32}
            />
            <p className="mt-4 text-lg font-bold text-slate-950">
              No viewings in this calendar view
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Schedule a property visit or change the calendar filter.
            </p>
          </div>
        )}
      </section>

      {isClientPickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <div
            aria-labelledby="choose-client-title"
            aria-modal="true"
            role="dialog"
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                  New viewing
                </p>
                <h2
                  id="choose-client-title"
                  className="mt-1 text-2xl font-bold text-slate-950"
                >
                  Choose the client
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  The next screen will use your current database properties
                  and order available ones by match score.
                </p>
              </div>
              <button
                aria-label="Close client picker"
                type="button"
                onClick={() => setIsClientPickerOpen(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-semibold text-slate-700">
                Client
              </span>
              <select
                value={pickerClientId}
                onChange={(event) => setPickerClientId(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} · {client.purpose} · {client.stage}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsClientPickerOpen(false)}
                className="min-h-12 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setScheduleClientId(pickerClientId);
                  setIsClientPickerOpen(false);
                }}
                className="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white"
              >
                Choose property
              </button>
            </div>
          </div>
        </div>
      )}

      {schedulingClient && (
        <ScheduleViewingModal
          client={schedulingClient}
          properties={properties}
          onClose={() => setScheduleClientId(null)}
          onSchedule={scheduleViewing}
        />
      )}

      {outcomeViewing && (
        <ViewingOutcomeModal
          viewing={outcomeViewing}
          client={clientById.get(outcomeViewing.clientId)}
          property={propertyById.get(outcomeViewing.propertyId)}
          onClose={() => setOutcomeViewingId(null)}
          onSave={(outcome, notes) =>
            saveOutcome(outcomeViewing, outcome, notes)
          }
        />
      )}
    </DashboardShell>
  );
}
