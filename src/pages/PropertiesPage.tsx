import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { DeletePropertyModal } from "../components/dashboard/properties/DeletePropertyModal";
import { PropertyCard } from "../components/dashboard/properties/PropertyCard";
import { PropertyCreateModal } from "../components/dashboard/properties/PropertyCreateModal";
import { PropertyDetailsModal } from "../components/dashboard/properties/PropertyDetailsModal";
import { PropertyEditModal } from "../components/dashboard/properties/PropertyEditModal";
import { loadActivities, saveActivities } from "../features/activities/activity-storage";
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
  createPropertyInDatabase,
  deletePropertyFromDatabase,
  listPropertiesFromDatabase,
  updatePropertyInDatabase,
} from "../features/properties/property-api";
import {
  duplicateProperty,
  filterAndSortProperties,
  getActivePropertyFilterCount,
  getPropertyStats,
  type PropertyFilters,
  type PropertySort,
} from "../features/properties/property-utils";
import { loadViewings, saveViewings } from "../features/viewings/viewing-storage";

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
  const [propertyList, setPropertyList] = useState<Property[]>([]);
  const [clients] = useState(loadClients);
  const [viewings, setViewings] = useState(() => loadViewings([]));
  const [activities, setActivities] = useState(loadActivities);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const isCreateOpen = searchParams.get("add") === "true";
  const selectedProperty = propertyList.find((property) => property.id === selectedPropertyId) ?? null;
  const editingProperty = propertyList.find((property) => property.id === editingPropertyId) ?? null;
  const pendingDeleteProperty = propertyList.find((property) => property.id === pendingDeleteId) ?? null;

  const filteredProperties = useMemo(
    () => filterAndSortProperties(propertyList, filters),
    [filters, propertyList],
  );
  const districts = useMemo(
    () => [...new Set(propertyList.map((property) => property.district))].filter(Boolean).sort(),
    [propertyList],
  );
  const propertyStats = getPropertyStats(propertyList);
  const activeFilterCount = getActivePropertyFilterCount(filters);
  const strongMatchCount = propertyList.reduce(
    (total, property) => total + getMatchesForProperty(property, clients, true).filter((match) => match.score >= 70).length,
    0,
  );
  const totalViewings = viewings.filter((viewing) => viewing.status !== "Cancelled").length;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    listPropertiesFromDatabase()
      .then((properties) => {
        if (!active) return;
        setPropertyList(properties);
        setPageError("");
      })
      .catch((error) => {
        if (!active) return;
        setPageError(error instanceof Error ? error.message : "Could not load properties from the database.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateFilter<Key extends keyof PropertyFilters>(key: Key, value: PropertyFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openCreateModal() {
    const next = new URLSearchParams(searchParams);
    next.set("add", "true");
    setSearchParams(next, { replace: true });
  }

  function closeCreateModal() {
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  }

  function createProperty(property: Property) {
    setPageError("");
    void createPropertyInDatabase(property)
      .then((saved) => {
        setPropertyList((current) => [saved, ...current]);
        setSelectedPropertyId(saved.id);
      })
      .catch((error) => {
        setPageError(error instanceof Error ? error.message : "Could not save the property.");
      });
    return true;
  }

  function saveEditedProperty(property: Property) {
    setPageError("");
    const previous = propertyList.find((item) => item.id === property.id);
    setPropertyList((current) => current.map((item) => (item.id === property.id ? property : item)));
    setEditingPropertyId(null);
    setSelectedPropertyId(property.id);
    void updatePropertyInDatabase(property)
      .then((saved) => setPropertyList((current) => current.map((item) => (item.id === saved.id ? saved : item))))
      .catch((error) => {
        if (previous) setPropertyList((current) => current.map((item) => (item.id === previous.id ? previous : item)));
        setPageError(error instanceof Error ? error.message : "Could not update the property.");
      });
    return true;
  }

  function updatePropertyStatus(propertyId: string, status: PropertyStatus) {
    const property = propertyList.find((item) => item.id === propertyId);
    if (!property) return;
    const updated = { ...property, status, updatedLabel: "Updated just now", updatedAt: new Date().toISOString() };
    setPropertyList((current) => current.map((item) => (item.id === propertyId ? updated : item)));
    void updatePropertyInDatabase(updated)
      .then((saved) => setPropertyList((current) => current.map((item) => (item.id === saved.id ? saved : item))))
      .catch((error) => setPageError(error instanceof Error ? error.message : "Could not update the property status."));
  }

  function duplicateSavedProperty(property: Property) {
    const duplicated = duplicateProperty(property, propertyList);
    void createPropertyInDatabase(duplicated)
      .then((saved) => {
        setPropertyList((current) => [saved, ...current]);
        setSelectedPropertyId(saved.id);
      })
      .catch((error) => setPageError(error instanceof Error ? error.message : "Could not duplicate the property."));
    return true;
  }

  function deleteSavedProperty(propertyId: string) {
    const deleted = propertyList.find((property) => property.id === propertyId);
    if (!deleted) return false;
    setPropertyList((current) => current.filter((property) => property.id !== propertyId));
    setPendingDeleteId(null);
    setSelectedPropertyId((current) => (current === propertyId ? null : current));
    void deletePropertyFromDatabase(propertyId).catch((error) => {
      setPropertyList((current) => [deleted, ...current]);
      setPageError(error instanceof Error ? error.message : "Could not delete the property.");
    });
    const nextViewings = viewings.filter((viewing) => viewing.propertyId !== propertyId);
    const nextActivities = activities.filter((activity) => activity.propertyId !== propertyId);
    saveViewings(nextViewings);
    saveActivities(nextActivities);
    setViewings(nextViewings);
    setActivities(nextActivities);
    return true;
  }

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">PROPERTY WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Properties</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Your listings are now loaded and saved through the EstateFlow database.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400">
          <Plus aria-hidden="true" size={18} /> Add property
        </button>
      </section>

      {pageError && (
        <div role="alert" className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <p>{pageError}</p>
          <button aria-label="Dismiss error" type="button" onClick={() => setPageError("")}><X size={17} /></button>
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total properties", propertyStats.total, "All database listings"],
          ["Available listings", propertyStats.available, "Ready to promote"],
          ["Strong matches", strongMatchCount, "Client-property pairs above 70%"],
          ["Viewings this week", totalViewings, "Keep follow-ups moving"],
        ].map(([label, value, note]) => (
          <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
            <p className="mt-2 text-sm font-medium text-slate-500">{note}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><SlidersHorizontal className="text-amber-700" size={18} /><h2 className="font-bold text-slate-950">Find the right property</h2></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <label className="relative sm:col-span-2 xl:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Search</span>
            <Search className="pointer-events-none absolute bottom-3.5 left-4 text-slate-400" size={18} />
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Title, district, owner, phone..." className={`${filterClassName} pl-11`} />
          </label>
          <label><span className="text-sm font-semibold text-slate-700">Purpose</span><select value={filters.purpose} onChange={(event) => updateFilter("purpose", event.target.value as "All" | PropertyPurpose)} className={filterClassName}><option value="All">All purposes</option><option value="Sale">For sale</option><option value="Rent">For rent</option></select></label>
          <label><span className="text-sm font-semibold text-slate-700">Status</span><select value={filters.status} onChange={(event) => updateFilter("status", event.target.value as "All" | PropertyStatus)} className={filterClassName}><option value="All">All statuses</option>{PROPERTY_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label><span className="text-sm font-semibold text-slate-700">Type</span><select value={filters.propertyType} onChange={(event) => updateFilter("propertyType", event.target.value as "All" | PropertyType)} className={filterClassName}><option value="All">All types</option>{PROPERTY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label><span className="text-sm font-semibold text-slate-700">District</span><select value={filters.district} onChange={(event) => updateFilter("district", event.target.value)} className={filterClassName}><option value="All">All districts</option>{districts.map((district) => <option key={district}>{district}</option>)}</select></label>
          <label className="sm:col-span-2 xl:col-span-2"><span className="text-sm font-semibold text-slate-700">Sort</span><select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value as PropertySort)} className={filterClassName}><option value="recently-updated">Recently updated</option><option value="highest-price">Highest price</option><option value="lowest-price">Lowest price</option><option value="newest">Newest</option></select></label>
        </div>
        {activeFilterCount > 0 && <button type="button" onClick={() => setFilters(defaultFilters)} className="mt-4 text-sm font-bold text-amber-700">Clear filters ({activeFilterCount})</button>}
      </section>

      <section className="mt-6">
        {isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Loading properties from PostgreSQL...</div> : filteredProperties.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-lg font-bold text-slate-950">No properties yet</p><p className="mt-2 text-sm text-slate-500">Add your first property and it will be saved in the EstateFlow database.</p></div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredProperties.map((property) => { const matches = getMatchesForProperty(property, clients, true); return <PropertyCard key={property.id} property={property} bestMatchScore={matches[0]?.score ?? 0} matchCount={matches.length} onView={() => setSelectedPropertyId(property.id)} onEdit={() => setEditingPropertyId(property.id)} onDuplicate={() => duplicateSavedProperty(property)} onDelete={() => setPendingDeleteId(property.id)} />; })}</div>}
      </section>

      {isCreateOpen && <PropertyCreateModal existingProperties={propertyList} onClose={closeCreateModal} onCreate={createProperty} />}
      {editingProperty && <PropertyEditModal property={editingProperty} onClose={() => setEditingPropertyId(null)} onSave={saveEditedProperty} />}
      {selectedProperty && <PropertyDetailsModal property={selectedProperty} clients={clients} viewings={viewings} activities={activities} onClose={() => setSelectedPropertyId(null)} onStatusChange={(status) => updatePropertyStatus(selectedProperty.id, status)} onEdit={() => { setEditingPropertyId(selectedProperty.id); setSelectedPropertyId(null); }} onDuplicate={() => duplicateSavedProperty(selectedProperty)} onDelete={() => { setPendingDeleteId(selectedProperty.id); setSelectedPropertyId(null); }} />}
      {pendingDeleteProperty && <DeletePropertyModal property={pendingDeleteProperty} onCancel={() => setPendingDeleteId(null)} onConfirm={() => deleteSavedProperty(pendingDeleteProperty.id)} />}
    </DashboardShell>
  );
}
