import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { DeletePropertyModal } from "../components/dashboard/properties/DeletePropertyModal";
import { PropertyCard } from "../components/dashboard/properties/PropertyCard";
import { PropertyCreateModal } from "../components/dashboard/properties/PropertyCreateModal";
import { PropertyDetailsModal } from "../components/dashboard/properties/PropertyDetailsModal";
import { PropertyEditModal } from "../components/dashboard/properties/PropertyEditModal";
import {
  loadActivities,
  saveActivities,
} from "../features/activities/activity-storage";
import { loadClients } from "../features/clients/client-storage";
import { getMatchesForProperty } from "../features/matching/matching";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type Property,
  type PropertyPurpose,
  type PropertyStatus,
  type PropertyType,
} from "../features/properties/property-data";
import {
  loadProperties,
  saveProperties,
} from "../features/properties/property-storage";
import {
  duplicateProperty,
  filterAndSortProperties,
  getActivePropertyFilterCount,
  getPropertyStats,
  type PropertyFilters,
  type PropertySort,
} from "../features/properties/property-utils";
import {
  loadViewings,
  saveViewings,
} from "../features/viewings/viewing-storage";

const defaultFilters: PropertyFilters = {
  search: "",
  purpose: "All",
  status: "All",
  propertyType: "All",
  district: "All",
  sort: "recently-updated",
};

const filterClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

export function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<PropertyFilters>(defaultFilters);
  const [propertyList, setPropertyList] = useState(loadProperties);
  const [clients] = useState(loadClients);
  const [viewings, setViewings] = useState(() => loadViewings(propertyList));
  const [activities, setActivities] = useState(loadActivities);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(
    null,
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState("");

  const isCreateOpen = searchParams.get("add") === "true";
  const selectedProperty =
    propertyList.find((property) => property.id === selectedPropertyId) ?? null;
  const editingProperty =
    propertyList.find((property) => property.id === editingPropertyId) ?? null;
  const pendingDeleteProperty =
    propertyList.find((property) => property.id === pendingDeleteId) ?? null;

  const filteredProperties = useMemo(
    () => filterAndSortProperties(propertyList, filters),
    [filters, propertyList],
  );
  const districts = useMemo(
    () =>
      [...new Set(propertyList.map((property) => property.district))]
        .filter(Boolean)
        .sort((first, second) => first.localeCompare(second)),
    [propertyList],
  );
  const activeFilterCount = getActivePropertyFilterCount(filters);
  const propertyStats = getPropertyStats(propertyList);
  const strongMatchCount = propertyList.reduce(
    (total, property) =>
      total +
      getMatchesForProperty(property, clients, true).filter(
        (match) => match.score >= 70,
      ).length,
    0,
  );
  const totalViewings = viewings.filter(
    (viewing) => viewing.status !== "Cancelled",
  ).length;

  function updateFilter<Key extends keyof PropertyFilters>(
    key: Key,
    value: PropertyFilters[Key],
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  function persistProperties(nextProperties: Property[]) {
    const result = saveProperties(nextProperties);

    if (!result.ok) {
      setStorageError(result.message);
      return false;
    }

    setPropertyList(nextProperties);
    setStorageError("");
    return true;
  }

  function openCreateModal() {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("add", "true");
    setSearchParams(nextSearchParams, { replace: true });
  }

  function closeCreateModal() {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("add");
    setSearchParams(nextSearchParams, { replace: true });
  }

  function createProperty(newProperty: Property) {
    const wasSaved = persistProperties([newProperty, ...propertyList]);

    if (wasSaved) {
      setSelectedPropertyId(newProperty.id);
    }

    return wasSaved;
  }

  function saveEditedProperty(updatedProperty: Property) {
    const nextProperties = propertyList.map((property) =>
      property.id === updatedProperty.id ? updatedProperty : property,
    );
    const wasSaved = persistProperties(nextProperties);

    if (wasSaved) {
      setSelectedPropertyId(updatedProperty.id);
      setEditingPropertyId(null);
    }

    return wasSaved;
  }

  function updatePropertyStatus(propertyId: string, newStatus: PropertyStatus) {
    const now = new Date().toISOString();
    const nextProperties = propertyList.map((property) =>
      property.id === propertyId
        ? {
            ...property,
            status: newStatus,
            updatedLabel: "Updated just now",
            updatedAt: now,
          }
        : property,
    );

    persistProperties(nextProperties);
  }

  function duplicateSavedProperty(property: Property) {
    const duplicatedProperty = duplicateProperty(property, propertyList);
    const wasSaved = persistProperties([duplicatedProperty, ...propertyList]);

    if (wasSaved) {
      setSelectedPropertyId(duplicatedProperty.id);
      setEditingPropertyId(null);
    }

    return wasSaved;
  }

  function deleteSavedProperty(propertyId: string) {
    const nextProperties = propertyList.filter(
      (property) => property.id !== propertyId,
    );
    const wasSaved = persistProperties(nextProperties);

    if (wasSaved) {
      const nextViewings = viewings.filter(
        (viewing) => viewing.propertyId !== propertyId,
      );
      const nextActivities = activities.filter(
        (activity) => activity.propertyId !== propertyId,
      );

      saveViewings(nextViewings);
      saveActivities(nextActivities);
      setViewings(nextViewings);
      setActivities(nextActivities);

      if (selectedPropertyId === propertyId) {
        setSelectedPropertyId(null);
      }

      if (editingPropertyId === propertyId) {
        setEditingPropertyId(null);
      }

      setPendingDeleteId(null);
    }

    return wasSaved;
  }

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">
            PROPERTY WORKSPACE
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Properties
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Keep every listing organized, active, and ready for the right
            client.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
        >
          <Plus aria-hidden="true" size={18} />
          Add property
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
          <p className="text-sm font-medium text-slate-500">Total properties</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {propertyStats.total}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            All saved listings
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Available listings
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {propertyStats.available}
          </p>
          <p className="mt-2 text-sm font-medium text-emerald-600">
            Ready to promote
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Strong matches</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {strongMatchCount}
          </p>
          <p className="mt-2 text-sm font-medium text-amber-700">
            Client-property pairs above 70%
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Viewings this week
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {totalViewings}
          </p>
          <p className="mt-2 text-sm font-medium text-sky-700">
            Keep follow-ups moving
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal
              aria-hidden="true"
              className="text-amber-700"
              size={18}
            />
            <h2 className="font-bold text-slate-950">
              Find the right property
            </h2>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                {activeFilterCount}{" "}
                {activeFilterCount === 1 ? "filter" : "filters"} active
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(defaultFilters)}
              className="min-h-11 self-start rounded-xl px-3 text-sm font-bold text-amber-700 transition hover:bg-amber-50 sm:self-auto"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <label className="relative sm:col-span-2 xl:col-span-2">
            <span className="text-sm font-semibold text-slate-700">
              Search properties
            </span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3.5 left-4 text-slate-400"
              size={18}
            />
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Title, district, owner, phone, type..."
              className={`${filterClassName} pl-11`}
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Purpose
            </span>
            <select
              value={filters.purpose}
              onChange={(event) =>
                updateFilter(
                  "purpose",
                  event.target.value as "All" | PropertyPurpose,
                )
              }
              className={filterClassName}
            >
              <option value="All">All purposes</option>
              <option value="Sale">For sale</option>
              <option value="Rent">For rent</option>
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">Status</span>
            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target.value as "All" | PropertyStatus,
                )
              }
              className={filterClassName}
            >
              <option value="All">All statuses</option>
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
              value={filters.propertyType}
              onChange={(event) =>
                updateFilter(
                  "propertyType",
                  event.target.value as "All" | PropertyType,
                )
              }
              className={filterClassName}
            >
              <option value="All">All types</option>
              {PROPERTY_TYPES.map((propertyType) => (
                <option key={propertyType} value={propertyType}>
                  {propertyType}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              District
            </span>
            <select
              value={filters.district}
              onChange={(event) => updateFilter("district", event.target.value)}
              className={filterClassName}
            >
              <option value="All">All districts</option>
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>

          <label className="sm:col-span-2 xl:col-span-2">
            <span className="text-sm font-semibold text-slate-700">
              Sort by
            </span>
            <select
              value={filters.sort}
              onChange={(event) =>
                updateFilter("sort", event.target.value as PropertySort)
              }
              className={filterClassName}
            >
              <option value="recently-updated">Recently updated</option>
              <option value="highest-price">Highest price</option>
              <option value="lowest-price">Lowest price</option>
              <option value="newest">Newest property</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-950">
              {filteredProperties.length}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-950">
              {propertyList.length}
            </span>{" "}
            {propertyList.length === 1 ? "property" : "properties"}
          </p>
          <p className="text-xs font-medium text-slate-400">
            Changes save automatically in this browser
          </p>
        </div>

        {filteredProperties.length > 0 && (
          <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filteredProperties.map((property) => {
              const propertyMatches = getMatchesForProperty(
                property,
                clients,
                true,
              );

              return (
                <PropertyCard
                  key={property.id}
                  property={property}
                  bestMatchScore={propertyMatches[0]?.score ?? 0}
                  matchCount={propertyMatches.length}
                  onView={() => setSelectedPropertyId(property.id)}
                  onEdit={() => setEditingPropertyId(property.id)}
                  onDuplicate={() => duplicateSavedProperty(property)}
                  onDelete={() => setPendingDeleteId(property.id)}
                />
              );
            })}
          </div>
        )}

        {filteredProperties.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Search
              aria-hidden="true"
              className="mx-auto text-slate-400"
              size={30}
            />
            <p className="mt-4 text-lg font-bold text-slate-950">
              {propertyList.length === 0
                ? "Add your first property"
                : "No properties match these filters"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {propertyList.length === 0
                ? "Create a complete listing with owner details, photos, pricing, and status."
                : "Clear the filters or change your search to see more saved listings."}
            </p>
            <button
              type="button"
              onClick={
                propertyList.length === 0
                  ? openCreateModal
                  : () => setFilters(defaultFilters)
              }
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              {propertyList.length === 0 ? "Add property" : "Clear all filters"}
            </button>
          </div>
        )}
      </section>

      {isCreateOpen && (
        <PropertyCreateModal
          existingProperties={propertyList}
          onClose={closeCreateModal}
          onCreate={createProperty}
        />
      )}

      {selectedProperty && !editingProperty && !pendingDeleteProperty && (
        <PropertyDetailsModal
          key={selectedProperty.id}
          property={selectedProperty}
          clients={clients}
          viewings={viewings}
          activities={activities}
          onClose={() => setSelectedPropertyId(null)}
          onStatusChange={(newStatus) =>
            updatePropertyStatus(selectedProperty.id, newStatus)
          }
          onEdit={() => setEditingPropertyId(selectedProperty.id)}
          onDuplicate={() => duplicateSavedProperty(selectedProperty)}
          onDelete={() => setPendingDeleteId(selectedProperty.id)}
        />
      )}

      {editingProperty && (
        <PropertyEditModal
          key={editingProperty.id}
          property={editingProperty}
          onClose={() => setEditingPropertyId(null)}
          onSave={saveEditedProperty}
        />
      )}

      {pendingDeleteProperty && (
        <DeletePropertyModal
          property={pendingDeleteProperty}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => deleteSavedProperty(pendingDeleteProperty.id)}
        />
      )}
    </DashboardShell>
  );
}
