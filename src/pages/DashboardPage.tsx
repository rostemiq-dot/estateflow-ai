import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { loadActivities } from "../features/activities/activity-storage";
import { loadClients } from "../features/clients/client-storage";
import { getAllSmartMatches } from "../features/matching/matching";
import { loadProperties } from "../features/properties/property-storage";
import { getPropertyStats } from "../features/properties/property-utils";
import { loadViewings } from "../features/viewings/viewing-storage";
import {
  formatViewingTime,
  getViewingTimestamp,
  isViewingToday,
} from "../features/viewings/viewing-utils";

const viewingStatusStyles = {
  Scheduled: "bg-amber-50 text-amber-700",
  Confirmed: "bg-emerald-50 text-emerald-700",
  Completed: "bg-slate-100 text-slate-600",
  Cancelled: "bg-rose-50 text-rose-700",
} as const;

function formatActivityTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const properties = loadProperties();
  const clients = loadClients();
  const viewings = loadViewings(properties);
  const activities = loadActivities();
  const propertyStats = getPropertyStats(properties);
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const propertyById = new Map(
    properties.map((property) => [property.id, property]),
  );
  const todayViewings = viewings
    .filter(
      (viewing) => isViewingToday(viewing) && viewing.status !== "Cancelled",
    )
    .sort(
      (first, second) =>
        getViewingTimestamp(first) - getViewingTimestamp(second),
    );
  const strongMatches = getAllSmartMatches(clients, properties).filter(
    (match) => match.score >= 70,
  );
  const recentActivities = [...activities]
    .sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt),
    )
    .slice(0, 5);
  const metrics = [
    {
      label: "Total properties",
      value: propertyStats.total,
      detail: "All saved listings",
      detailClassName: "text-slate-500",
    },
    {
      label: "Available",
      value: propertyStats.available,
      detail: "Ready to promote",
      detailClassName: "text-emerald-600",
    },
    {
      label: "For sale",
      value: propertyStats.forSale,
      detail: "Buyer opportunities",
      detailClassName: "text-amber-700",
    },
    {
      label: "For rent",
      value: propertyStats.forRent,
      detail: "Tenant opportunities",
      detailClassName: "text-sky-700",
    },
    {
      label: "Sold / Rented",
      value: propertyStats.closed,
      detail: "Completed listings",
      detailClassName: "text-violet-700",
    },
    {
      label: "Active clients",
      value: clients.length,
      detail: `${strongMatches.length} strong matching pairs`,
      detailClassName: "text-emerald-600",
    },
  ];

  return (
    <DashboardShell>
      <section>
        <p className="text-sm font-semibold text-amber-700">OVERVIEW</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Your business at a glance
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Live properties, clients, smart matches, viewings, and follow-up
          activity in one workspace.
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {metric.value}
            </p>
            <p className={`mt-3 text-sm font-medium ${metric.detailClassName}`}>
              {metric.detail}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Today’s viewings
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {todayViewings.length}{" "}
                {todayViewings.length === 1 ? "visit" : "visits"} scheduled
                today.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/viewings")}
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-sm font-bold text-amber-700 transition hover:bg-amber-50 sm:self-auto"
            >
              View calendar
              <ArrowRight aria-hidden="true" size={16} />
            </button>
          </div>

          {todayViewings.length > 0 ? (
            <div className="mt-6 divide-y divide-slate-100">
              {todayViewings.map((viewing) => {
                const client = clientById.get(viewing.clientId);
                const property = propertyById.get(viewing.propertyId);

                return (
                  <div
                    key={viewing.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                  >
                    <p className="w-20 shrink-0 text-sm font-bold text-slate-950">
                      {formatViewingTime(viewing.time)}
                    </p>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-950">
                        {client?.name ?? "Client unavailable"}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {property?.title ?? "Property unavailable"} ·{" "}
                        {property?.district ?? viewing.location}
                      </p>
                    </div>
                    <span
                      className={`h-fit w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${viewingStatusStyles[viewing.status]}`}
                    >
                      {viewing.outcome ?? viewing.status}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <CalendarDays
                aria-hidden="true"
                className="mx-auto text-slate-400"
                size={30}
              />
              <p className="mt-3 font-bold text-slate-950">No viewings today</p>
              <p className="mt-1 text-sm text-slate-500">
                Open the calendar to schedule the next property visit.
              </p>
              <button
                type="button"
                onClick={() => navigate("/viewings")}
                className="mt-4 min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"
              >
                Open calendar
              </button>
            </div>
          )}
        </article>

        <div className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-slate-950 p-6 shadow-sm">
            <p className="text-sm font-semibold text-amber-400">
              QUICK ACTIONS
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              Move your work forward
            </h2>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => navigate("/properties?add=true")}
                className="min-h-12 rounded-xl bg-amber-400 px-4 text-left text-sm font-bold text-slate-950 transition hover:bg-amber-300"
              >
                + Add a new property
              </button>
              <button
                type="button"
                onClick={() => navigate("/clients?add=true")}
                className="min-h-12 rounded-xl border border-slate-700 px-4 text-left text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                + Create a client profile
              </button>
              <button
                type="button"
                onClick={() => navigate("/matches")}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 px-4 text-left text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Sparkles aria-hidden="true" size={17} />
                Review smart matches
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">
                Recent activity
              </p>
              <span className="text-xs font-semibold text-slate-400">
                Live history
              </span>
            </div>

            {recentActivities.length > 0 ? (
              <div className="mt-4 space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <p className="text-sm leading-6 text-slate-600">
                        {activity.text}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {clientById.get(activity.clientId)?.name ??
                          "Saved activity"}{" "}
                        · {formatActivityTime(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Client notes, WhatsApp follow-ups, viewings, and outcomes will
                appear here automatically.
              </p>
            )}
          </article>
        </div>
      </section>
    </DashboardShell>
  );
}
