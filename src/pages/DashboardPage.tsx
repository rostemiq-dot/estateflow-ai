import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { loadActivities } from "../features/activities/activity-storage";
import { loadClients } from "../features/clients/client-storage";
import { loadContracts } from "../features/contracts/contract-storage";
import { loadDeals } from "../features/deals/deal-storage";
import {
  formatMoney,
  getDealMetrics,
  isClosedStage,
} from "../features/deals/deal-utils";
import { loadProperties } from "../features/properties/property-storage";
import { loadDocumentMetadata } from "../features/documents/document-storage";
import { loadTasks, taskTiming } from "../features/tasks/task-storage";
import { derivePaymentStatus } from "../features/deals/deal-utils";
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
  const dashboardNow = new Date();
  const properties = loadProperties();
  const clients = loadClients();
  const viewings = loadViewings(properties);
  const activities = loadActivities();
  const deals = loadDeals(clients, properties);
  const contracts = loadContracts();
  const tasks = loadTasks();
  const documents = loadDocumentMetadata();
  const dealMetrics = getDealMetrics(deals);
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
  const recentActivities = [...activities]
    .sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt),
    )
    .slice(0, 5);
  const upcomingDealActions = deals
    .filter(
      (deal) =>
        !deal.archived && !isClosedStage(deal.stage) && deal.nextActionAt,
    )
    .sort((first, second) =>
      first.nextActionAt.localeCompare(second.nextActionAt),
    )
    .slice(0, 5);
  const operationalMetrics = [
    {
      label: "Awaiting signature",
      value: contracts.filter((contract) =>
        ["Under Review", "Ready to Sign"].includes(contract.status),
      ).length,
      detail: "Contracts",
    },
    {
      label: "Recently signed",
      value: contracts.filter((contract) => contract.status === "Signed")
        .length,
      detail: "Signed contracts",
    },
    {
      label: "Tasks today",
      value: tasks.filter((task) => taskTiming(task).today).length,
      detail: "Scheduled follow-ups",
    },
    {
      label: "Overdue tasks",
      value: tasks.filter((task) => taskTiming(task).overdue).length,
      detail: "Need attention",
    },
    {
      label: "Offers expiring",
      value: deals
        .flatMap((deal) => deal.offers)
        .filter((offer) => {
          if (offer.status !== "Sent" || !offer.expirationDate) return false;
          const days =
            (Date.parse(`${offer.expirationDate}T23:59:59`) -
              dashboardNow.getTime()) /
            86_400_000;
          return days >= 0 && days <= 7;
        }).length,
      detail: "Next seven days",
    },
    {
      label: "Payments overdue",
      value: deals
        .flatMap((deal) => deal.payments)
        .filter((payment) => derivePaymentStatus(payment) === "Overdue").length,
      detail: "Collection follow-ups",
    },
  ];
  const recentDocuments = [...documents]
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    .slice(0, 4);
  const metrics = [
    {
      label: "Active deals",
      value: dealMetrics.activeDeals,
      detail: "Open pipeline",
      detailClassName: "text-sky-700",
    },
    {
      label: "Pipeline value",
      value: formatMoney(dealMetrics.pipelineValueMinor, "USD"),
      detail: "Saved deal values",
      detailClassName: "text-amber-700",
    },
    {
      label: "Won deals",
      value: dealMetrics.wonDeals,
      detail: "Closed successfully",
      detailClassName: "text-emerald-600",
    },
    {
      label: "Expected commission",
      value: formatMoney(dealMetrics.expectedCommissionMinor, "USD"),
      detail: "Active agency commission",
      detailClassName: "text-violet-700",
    },
    {
      label: "Collected",
      value: formatMoney(dealMetrics.collectedPaymentsMinor, "USD"),
      detail: "Recorded payments",
      detailClassName: "text-emerald-600",
    },
    {
      label: "Outstanding",
      value: formatMoney(dealMetrics.outstandingBalanceMinor, "USD"),
      detail: `${dealMetrics.overduePayments} overdue`,
      detailClassName:
        dealMetrics.overduePayments > 0 ? "text-rose-600" : "text-slate-500",
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
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {metric.value}
            </p>
            <p className={`mt-3 text-sm font-medium ${metric.detailClassName}`}>
              {metric.detail}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Upcoming deal actions
            </p>
            <p className="mt-1 text-sm text-slate-500">
              The next saved follow-ups across your active pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/deals")}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-sm font-bold text-amber-700 hover:bg-amber-50 sm:self-auto"
          >
            Open deals <ArrowRight size={16} />
          </button>
        </div>
        {upcomingDealActions.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {upcomingDealActions.map((deal) => (
              <button
                key={deal.id}
                type="button"
                onClick={() => navigate("/deals")}
                className="rounded-xl bg-slate-50 p-4 text-left transition hover:bg-amber-50"
              >
                <p className="font-bold text-slate-950">{deal.nextAction}</p>
                <p className="mt-1 text-sm text-slate-500">{deal.title}</p>
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  {formatActivityTime(deal.nextActionAt)} · {deal.stage}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            Add a next action to an active deal and it will appear here.
          </p>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Contracts, tasks, and documents
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Live operational status from saved records.
            </p>
          </div>
          <button
            onClick={() => navigate("/tasks")}
            className="min-h-11 rounded-xl px-3 text-sm font-bold text-amber-700"
          >
            Open tasks
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {operationalMetrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <p className="text-xs font-semibold text-slate-500">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {metric.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">{metric.detail}</p>
            </article>
          ))}
        </div>
        <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-950">Recent document activity</p>
            <button
              onClick={() => navigate("/documents")}
              className="min-h-11 rounded-xl px-3 text-sm font-bold text-amber-700"
            >
              Document Center
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {recentDocuments.map((document) => (
              <div key={document.id} className="rounded-xl bg-slate-50 p-3">
                <p className="truncate text-sm font-bold">{document.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {document.category} · {document.entityType}{" "}
                  {document.entityId}
                </p>
              </div>
            ))}
            {!recentDocuments.length && (
              <p className="text-sm text-slate-500">
                Uploaded document activity will appear here.
              </p>
            )}
          </div>
        </article>
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
                onClick={() => navigate("/deals")}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 px-4 text-left text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Sparkles aria-hidden="true" size={17} />
                Open the deal pipeline
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
