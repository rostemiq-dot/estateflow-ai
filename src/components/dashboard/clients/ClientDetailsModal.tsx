import {
  CalendarPlus,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import type {
  Activity,
  ActivityDraft,
} from "../../../features/activities/activity-data";
import type { Client } from "../../../features/clients/client-data";
import type { Property } from "../../../features/properties/property-data";
import { loadTasks } from "../../../features/tasks/task-storage";
import type {
  Viewing,
  ViewingDraft,
} from "../../../features/viewings/viewing-data";
import {
  formatViewingDate,
  formatViewingTime,
  getViewingsForClient,
} from "../../../features/viewings/viewing-utils";
import {
  createClientFollowUpMessage,
  createWhatsAppUrl,
} from "../../../lib/whatsapp";
import { ClientNotesModal } from "./ClientNotesModal";
import { ClientSmartMatchesModal } from "./ClientSmartMatchesModal";
import { ScheduleViewingModal } from "./ScheduleViewingModal";

type ClientDetailsModalProps = {
  client: Client;
  properties: readonly Property[];
  viewings: readonly Viewing[];
  activities: readonly Activity[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onScheduleViewing: (details: ViewingDraft) => void;
  onSaveActivity: (
    activity: Pick<ActivityDraft, "type" | "text" | "propertyId">,
  ) => void;
};

function formatBudget(amount: number, currency: "USD" | "IQD") {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return `${new Intl.NumberFormat("en-US").format(amount)} IQD`;
}

function formatActivityDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

const activityStyles: Record<Activity["type"], string> = {
  Call: "bg-sky-50 text-sky-700",
  WhatsApp: "bg-emerald-50 text-emerald-700",
  Meeting: "bg-violet-50 text-violet-700",
  General: "bg-amber-50 text-amber-800",
  Viewing: "bg-cyan-50 text-cyan-700",
  Outcome: "bg-fuchsia-50 text-fuchsia-700",
};

const viewingStatusStyles: Record<Viewing["status"], string> = {
  Scheduled: "bg-amber-50 text-amber-800",
  Confirmed: "bg-emerald-50 text-emerald-700",
  Completed: "bg-slate-100 text-slate-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

export function ClientDetailsModal({
  client,
  properties,
  viewings,
  activities,
  onClose,
  onEdit,
  onDelete,
  onScheduleViewing,
  onSaveActivity,
}: ClientDetailsModalProps) {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [schedulePropertyId, setSchedulePropertyId] = useState<string>();
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSmartMatchesOpen, setIsSmartMatchesOpen] = useState(false);
  const clientViewings = getViewingsForClient(viewings, client.id);
  const linkedTasks = loadTasks().filter(
    (task) => !task.archived && task.clientId === client.id,
  );
  const propertyById = new Map(
    properties.map((property) => [property.id, property]),
  );

  function startScheduling(propertyId?: string) {
    setSchedulePropertyId(propertyId);
    setIsSmartMatchesOpen(false);
    setIsScheduleOpen(true);
  }

  return (
    <>
      {!isScheduleOpen && !isNotesOpen && !isSmartMatchesOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <div
            aria-labelledby="client-details-title"
            aria-modal="true"
            role="dialog"
            className="mx-auto my-4 max-w-5xl overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-5 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl font-bold text-amber-800">
                  {client.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                    Client profile
                  </p>
                  <h2
                    id="client-details-title"
                    className="mt-1 truncate text-2xl font-bold text-slate-950"
                  >
                    {client.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {client.id} · {client.stage}
                  </p>
                </div>
              </div>

              <button
                aria-label="Close client profile"
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <div className="grid lg:grid-cols-[1fr_0.42fr]">
              <main className="min-w-0 p-5 sm:p-7">
                <section className="rounded-2xl bg-slate-950 p-5 text-white">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
                        Smart summary
                      </p>
                      <p className="mt-3 text-lg font-semibold">
                        {client.smartSummary}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Next step: {client.recommendedAction}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-center">
                      <p className="text-xs font-semibold text-slate-300">
                        LEAD SCORE
                      </p>
                      <p className="mt-1 text-2xl font-bold text-amber-300">
                        {client.leadScore}%
                      </p>
                    </div>
                  </div>
                </section>

                <section className="mt-6 grid gap-5 md:grid-cols-2">
                  <article className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Contact information
                    </p>
                    <div className="mt-4 space-y-4">
                      <a
                        href={`tel:${client.phone}`}
                        className="flex items-center gap-3 text-sm font-semibold text-slate-950 hover:text-amber-700"
                      >
                        <Phone
                          aria-hidden="true"
                          className="text-slate-400"
                          size={18}
                        />
                        {client.phone}
                      </a>
                      <a
                        href={`mailto:${client.email}`}
                        className="flex items-center gap-3 text-sm font-semibold text-slate-950 hover:text-amber-700"
                      >
                        <Mail
                          aria-hidden="true"
                          className="text-slate-400"
                          size={18}
                        />
                        {client.email}
                      </a>
                      <p className="text-sm text-slate-500">
                        Assigned to{" "}
                        <span className="font-semibold text-slate-800">
                          {client.assignedAgent}
                        </span>
                      </p>
                    </div>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Property requirements
                    </p>
                    <div className="mt-4 space-y-3 text-sm">
                      <p className="font-semibold text-slate-950">
                        {client.purpose} ·{" "}
                        {client.propertyTypes.length > 0
                          ? client.propertyTypes.join(" / ")
                          : "Any property type"}
                      </p>
                      <p className="font-semibold text-slate-950">
                        {formatBudget(client.budgetMin, client.currency)} –{" "}
                        {formatBudget(client.budgetMax, client.currency)}
                      </p>
                      <p className="text-slate-600">
                        {client.minBedrooms > 0
                          ? `${client.minBedrooms}+ bedrooms · `
                          : ""}
                        {client.propertyNeeds}
                      </p>
                    </div>
                  </article>
                </section>

                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Preferred areas
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {client.preferredAreas.length > 0 ? (
                      client.preferredAreas.map((area) => (
                        <span
                          key={area}
                          className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800"
                        >
                          {area}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">
                        Open to any area
                      </span>
                    )}
                  </div>
                </section>

                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Viewings
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Every visit stays connected to the client and property.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startScheduling()}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <CalendarPlus aria-hidden="true" size={17} />
                      Schedule
                    </button>
                  </div>

                  {clientViewings.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {clientViewings.map((viewing) => {
                        const property = propertyById.get(viewing.propertyId);

                        return (
                          <article
                            key={viewing.id}
                            className="rounded-xl bg-slate-50 p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-bold text-slate-950">
                                  {property?.title ?? "Property unavailable"}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {formatViewingDate(viewing.date)} at{" "}
                                  {formatViewingTime(viewing.time)}
                                </p>
                                {viewing.location && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {viewing.location}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${viewingStatusStyles[viewing.status]}`}
                              >
                                {viewing.outcome ?? viewing.status}
                              </span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-slate-500">
                      No viewing is scheduled yet.
                    </p>
                  )}
                </section>

                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Activity timeline
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Calls, messages, meetings, viewings, and outcomes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNotesOpen(true)}
                      className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      + Add activity
                    </button>
                  </div>

                  {activities.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {activities.map((activity) => {
                        const property = activity.propertyId
                          ? propertyById.get(activity.propertyId)
                          : undefined;

                        return (
                          <article
                            key={activity.id}
                            className="rounded-xl bg-slate-50 p-4"
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
                            {property && (
                              <p className="mt-2 text-xs font-semibold text-amber-700">
                                Related property: {property.title}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-slate-500">
                      No activity saved yet. Add the first call or message.
                    </p>
                  )}
                </section>
              </main>

              <aside className="border-t border-slate-200 bg-white p-5 sm:p-7 lg:border-l lg:border-t-0">
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSmartMatchesOpen(true)}
                    className="min-h-12 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
                  >
                    View smart matches
                  </button>
                  <a
                    href={createWhatsAppUrl(
                      client.phone,
                      createClientFollowUpMessage(client),
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500"
                  >
                    <MessageCircle aria-hidden="true" size={18} />
                    WhatsApp follow-up
                  </a>
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    <Phone aria-hidden="true" size={18} />
                    Call client
                  </a>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil aria-hidden="true" size={17} />
                    Edit client
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 aria-hidden="true" size={17} />
                    Delete client
                  </button>
                </div>

                <section className="mt-7 rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Next follow-up
                  </p>
                  <p className="mt-3 font-bold text-slate-950">
                    {client.followUp}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-amber-700">
                    {linkedTasks.length} linked tasks
                  </p>
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}

      {isScheduleOpen && (
        <ScheduleViewingModal
          client={client}
          properties={properties}
          initialPropertyId={schedulePropertyId}
          onClose={() => setIsScheduleOpen(false)}
          onSchedule={(details) => {
            onScheduleViewing(details);
            setIsScheduleOpen(false);
          }}
        />
      )}

      {isNotesOpen && (
        <ClientNotesModal
          client={client}
          properties={properties}
          onClose={() => setIsNotesOpen(false)}
          onSave={(activity) => {
            onSaveActivity(activity);
            setIsNotesOpen(false);
          }}
        />
      )}

      {isSmartMatchesOpen && (
        <ClientSmartMatchesModal
          client={client}
          properties={properties}
          onClose={() => setIsSmartMatchesOpen(false)}
          onSchedule={startScheduling}
        />
      )}
    </>
  );
}
