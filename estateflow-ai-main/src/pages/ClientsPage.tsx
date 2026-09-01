import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { ClientDetailsModal } from "../components/dashboard/clients/ClientDetailsModal";
import { ClientFormModal } from "../components/dashboard/clients/ClientFormModal";
import { DeleteClientModal } from "../components/dashboard/clients/DeleteClientModal";
import {
  createActivity,
  getActivitiesForClient,
  loadActivities,
  saveActivities,
} from "../features/activities/activity-storage";
import {
  type Client,
  type ClientPurpose,
  type ClientStage,
} from "../features/clients/client-data";
import { loadClients, saveClients } from "../features/clients/client-storage";
import { getMatchesForClient } from "../features/matching/matching";
import { loadProperties } from "../features/properties/property-storage";
import type { ViewingDraft } from "../features/viewings/viewing-data";
import {
  createViewing,
  loadViewings,
  saveViewings,
} from "../features/viewings/viewing-storage";
import { isViewingToday } from "../features/viewings/viewing-utils";

const stageStyles: Record<ClientStage, string> = {
  "New Lead": "bg-sky-50 text-sky-700",
  Contacted: "bg-violet-50 text-violet-700",
  Qualified: "bg-amber-50 text-amber-700",
  Viewing: "bg-emerald-50 text-emerald-700",
  Negotiating: "bg-orange-50 text-orange-700",
  Closed: "bg-slate-100 text-slate-600",
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

function isDateToday(value: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [purpose, setPurpose] = useState<"All" | ClientPurpose>("All");
  const [stage, setStage] = useState<"All" | ClientStage>("All");
  const [clientList, setClientList] = useState(loadClients);
  const [properties] = useState(loadProperties);
  const [viewings, setViewings] = useState(() => loadViewings(properties));
  const [activities, setActivities] = useState(loadActivities);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState("");

  const isCreateOpen = searchParams.get("add") === "true";
  const selectedClient =
    clientList.find((client) => client.id === selectedClientId) ?? null;
  const editingClient =
    clientList.find((client) => client.id === editingClientId) ?? null;
  const pendingDeleteClient =
    clientList.find((client) => client.id === pendingDeleteId) ?? null;

  const filteredClients = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return clientList.filter((client) => {
      const matchesSearch =
        searchTerm.length === 0 ||
        [
          client.name,
          client.phone,
          client.email,
          client.id,
          client.propertyNeeds,
          ...client.preferredAreas,
          ...client.propertyTypes,
        ].some((value) => value.toLowerCase().includes(searchTerm));
      const matchesPurpose = purpose === "All" || client.purpose === purpose;
      const matchesStage = stage === "All" || client.stage === stage;

      return matchesSearch && matchesPurpose && matchesStage;
    });
  }, [clientList, purpose, search, stage]);

  const activeFilterCount = [
    search.trim().length > 0,
    purpose !== "All",
    stage !== "All",
  ].filter(Boolean).length;
  const todayViewings = viewings.filter(
    (viewing) =>
      isViewingToday(viewing) &&
      viewing.status !== "Cancelled" &&
      viewing.status !== "Completed",
  ).length;
  const followUpsToday = clientList.filter((client) =>
    isDateToday(client.followUpAt),
  ).length;

  function closeCreateModal() {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("add");
    setSearchParams(nextSearchParams, { replace: true });
  }

  function openCreateModal() {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("add", "true");
    setSearchParams(nextSearchParams, { replace: true });
  }

  function persistClients(nextClients: Client[]) {
    const result = saveClients(nextClients);

    if (!result.ok) {
      setStorageError(result.message);
      return false;
    }

    setClientList(nextClients);
    setStorageError("");
    return true;
  }

  function saveClient(client: Client) {
    const clientExists = clientList.some(
      (existingClient) => existingClient.id === client.id,
    );
    const nextClients = clientExists
      ? clientList.map((existingClient) =>
          existingClient.id === client.id ? client : existingClient,
        )
      : [client, ...clientList];
    const wasSaved = persistClients(nextClients);

    if (wasSaved) {
      setSelectedClientId(client.id);
      setEditingClientId(null);
      closeCreateModal();
    }

    return wasSaved;
  }

  function addActivity(activity: Parameters<typeof createActivity>[0]) {
    const nextActivities = [createActivity(activity), ...activities];

    if (saveActivities(nextActivities)) {
      setActivities(nextActivities);
      return true;
    }

    setStorageError("This activity could not be saved. Please try again.");
    return false;
  }

  function scheduleViewing(details: ViewingDraft) {
    const viewing = createViewing(details, viewings);
    const nextViewings = [viewing, ...viewings];
    const property = properties.find(
      (candidate) => candidate.id === viewing.propertyId,
    );

    if (!saveViewings(nextViewings)) {
      setStorageError("This viewing could not be saved. Please try again.");
      return;
    }

    setViewings(nextViewings);
    addActivity({
      clientId: viewing.clientId,
      propertyId: viewing.propertyId,
      viewingId: viewing.id,
      type: "Viewing",
      text: `Viewing scheduled for ${property?.title ?? "property"} on ${
        viewing.date
      } at ${viewing.time}.`,
    });
  }

  function deleteClient(clientId: string) {
    const nextClients = clientList.filter((client) => client.id !== clientId);
    const nextViewings = viewings.filter(
      (viewing) => viewing.clientId !== clientId,
    );
    const nextActivities = activities.filter(
      (activity) => activity.clientId !== clientId,
    );

    if (!saveClients(nextClients).ok) {
      setStorageError("This client could not be deleted. Please try again.");
      return;
    }

    saveViewings(nextViewings);
    saveActivities(nextActivities);
    setClientList(nextClients);
    setViewings(nextViewings);
    setActivities(nextActivities);
    setSelectedClientId(null);
    setEditingClientId(null);
    setPendingDeleteId(null);
  }

  function clearFilters() {
    setSearch("");
    setPurpose("All");
    setStage("All");
  }

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">CLIENT CRM</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Clients
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Save exact requirements, find the right properties, and keep every
            follow-up and viewing connected.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
        >
          <Plus aria-hidden="true" size={18} />
          Add client
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
            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg transition hover:bg-rose-100"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total clients</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {clientList.length}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Saved profiles
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Today’s viewings</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {todayViewings}
          </p>
          <p className="mt-2 text-sm font-medium text-emerald-600">
            Real calendar records
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Follow-ups today</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {followUpsToday}
          </p>
          <p className="mt-2 text-sm font-medium text-amber-700">
            Calls and messages due
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Qualified leads</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {clientList.filter((client) => client.leadScore >= 80).length}
          </p>
          <p className="mt-2 text-sm font-medium text-sky-700">
            High-intent opportunities
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-bold text-slate-950">Find the right client</h2>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 self-start rounded-xl px-3 text-sm font-bold text-amber-700 transition hover:bg-amber-50 sm:self-auto"
            >
              Clear {activeFilterCount}{" "}
              {activeFilterCount === 1 ? "filter" : "filters"}
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
          <label className="relative">
            <span className="text-sm font-semibold text-slate-700">
              Search clients
            </span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3.5 left-4 text-slate-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, phone, area, type, or client ID..."
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Looking to
            </span>
            <select
              value={purpose}
              onChange={(event) =>
                setPurpose(event.target.value as "All" | ClientPurpose)
              }
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            >
              <option value="All">Buy or rent</option>
              <option value="Buy">Buy</option>
              <option value="Rent">Rent</option>
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Pipeline stage
            </span>
            <select
              value={stage}
              onChange={(event) =>
                setStage(event.target.value as "All" | ClientStage)
              }
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            >
              <option value="All">All stages</option>
              <option value="New Lead">New lead</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Viewing">Viewing</option>
              <option value="Negotiating">Negotiating</option>
              <option value="Closed">Closed</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6">
        <p className="text-sm font-medium text-slate-500">
          Showing{" "}
          <span className="font-bold text-slate-950">
            {filteredClients.length}
          </span>{" "}
          of{" "}
          <span className="font-bold text-slate-950">{clientList.length}</span>{" "}
          clients
        </p>

        {filteredClients.length > 0 && (
          <div className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filteredClients.map((client) => {
              const topMatch = getMatchesForClient(client, properties)[0];

              return (
                <article
                  key={client.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-lg font-bold text-amber-800">
                        {client.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-400">
                          {client.id}
                        </p>
                        <h2 className="truncate text-lg font-bold text-slate-950">
                          {client.name}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {client.phone}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${stageStyles[client.stage]}`}
                    >
                      {client.stage}
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Looking to {client.purpose.toLowerCase()}
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-950">
                      {formatBudget(client.budgetMin, client.currency)} –{" "}
                      {formatBudget(client.budgetMax, client.currency)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {client.propertyTypes.length > 0
                        ? client.propertyTypes.join(" / ")
                        : "Any property type"}
                      {client.minBedrooms > 0
                        ? ` · ${client.minBedrooms}+ bedrooms`
                        : ""}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {client.preferredAreas.length > 0 ? (
                      client.preferredAreas.map((area) => (
                        <span
                          key={area}
                          className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
                        >
                          {area}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Any area</span>
                    )}
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Best live match
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          topMatch ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {topMatch
                          ? `${topMatch.score}% · ${topMatch.property.title}`
                          : "No available match"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedClientId(client.id)}
                      className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open
                    </button>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    Follow up: {client.followUp}
                  </p>
                </article>
              );
            })}
          </div>
        )}

        {filteredClients.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Search
              aria-hidden="true"
              className="mx-auto text-slate-400"
              size={30}
            />
            <p className="mt-4 text-lg font-bold text-slate-950">
              No clients found
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Change your search or clear the filters to see more profiles.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {isCreateOpen && (
        <ClientFormModal
          existingClients={clientList}
          onClose={closeCreateModal}
          onSave={saveClient}
        />
      )}

      {selectedClient && !editingClient && !pendingDeleteClient && (
        <ClientDetailsModal
          client={selectedClient}
          properties={properties}
          viewings={viewings}
          activities={getActivitiesForClient(activities, selectedClient.id)}
          onClose={() => setSelectedClientId(null)}
          onEdit={() => setEditingClientId(selectedClient.id)}
          onDelete={() => setPendingDeleteId(selectedClient.id)}
          onScheduleViewing={scheduleViewing}
          onSaveActivity={(activity) =>
            addActivity({
              ...activity,
              clientId: selectedClient.id,
            })
          }
        />
      )}

      {editingClient && (
        <ClientFormModal
          client={editingClient}
          existingClients={clientList}
          onClose={() => setEditingClientId(null)}
          onSave={saveClient}
        />
      )}

      {pendingDeleteClient && (
        <DeleteClientModal
          client={pendingDeleteClient}
          relatedViewings={
            viewings.filter(
              (viewing) => viewing.clientId === pendingDeleteClient.id,
            ).length
          }
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => deleteClient(pendingDeleteClient.id)}
        />
      )}
    </DashboardShell>
  );
}
