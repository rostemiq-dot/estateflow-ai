import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, CalendarDays, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { DashboardSkeleton } from "../components/ui/DatabasePageSkeleton";
import { listClientsFromDatabase } from "../features/clients/client-api";
import type { Client } from "../features/clients/client-data";
import { listPropertiesFromDatabase } from "../features/properties/property-api";
import type { Property } from "../features/properties/property-data";
import { listViewingsFromDatabase, type DatabaseViewing } from "../features/viewings/viewing-api";

export function DashboardPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [viewings, setViewings] = useState<DatabaseViewing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([listPropertiesFromDatabase(), listClientsFromDatabase(), listViewingsFromDatabase()])
      .then(([liveProperties, liveClients, liveViewings]) => {
        if (!active) return;
        setProperties(liveProperties);
        setClients(liveClients);
        setViewings(liveViewings);
        setError("");
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Could not load live dashboard data."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const activeProperties = properties.filter((p) => !["Sold", "Rented"].includes(p.status));
  const upcoming = useMemo(() => viewings.filter((v) => !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(v.status) && new Date(v.startAt).getTime() >= Date.now()).slice(0, 5), [viewings]);

  return <DashboardShell>
    <section><p className="text-sm font-semibold text-amber-700">OVERVIEW · LIVE DATABASE</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Your business at a glance</h1><p className="mt-2 max-w-2xl text-slate-600">The dashboard uses the same authenticated PostgreSQL data on every device. Browser demo records are not used.</p></section>
    {error && <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
    {loading ? <DashboardSkeleton /> : <>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border bg-white p-5 shadow-sm"><Building2 className="text-amber-700" size={22}/><p className="mt-4 text-sm text-slate-500">Properties</p><p className="mt-2 text-3xl font-bold">{properties.length}</p><p className="mt-1 text-sm text-slate-500">{activeProperties.length} active listings</p></article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm"><Users className="text-amber-700" size={22}/><p className="mt-4 text-sm text-slate-500">Clients</p><p className="mt-2 text-3xl font-bold">{clients.length}</p><p className="mt-1 text-sm text-slate-500">Real CRM records</p></article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm"><CalendarDays className="text-amber-700" size={22}/><p className="mt-4 text-sm text-slate-500">Viewings</p><p className="mt-2 text-3xl font-bold">{viewings.filter(v => v.status !== "CANCELLED").length}</p><p className="mt-1 text-sm text-slate-500">Saved in database</p></article>
      </section>
      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">Current properties</h2><p className="mt-1 text-sm text-slate-500">Live listings from PostgreSQL.</p></div><button onClick={() => navigate("/properties")} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold text-amber-700">Open <ArrowRight size={15}/></button></div><div className="mt-5 space-y-3">{properties.slice(0, 5).map(p => <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><div><p className="font-bold text-slate-950">{p.title}</p><p className="mt-1 text-xs text-slate-500">{p.district || p.location} · {p.status}</p></div><p className="text-sm font-bold">{p.currency} {p.price.toLocaleString()}</p></div>)}{!properties.length && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No properties are currently stored in the database.</p>}</div></article>
        <article className="rounded-2xl border bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold">Upcoming viewings</h2><p className="mt-1 text-sm text-slate-500">Only real saved appointments.</p></div><button onClick={() => navigate("/viewings")} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold text-amber-700">Open <ArrowRight size={15}/></button></div><div className="mt-5 space-y-3">{upcoming.map(v => <div key={v.id} className="rounded-xl bg-slate-50 p-4"><p className="font-bold">{v.title}</p><p className="mt-1 text-sm text-slate-500">{new Date(v.startAt).toLocaleString()} · {v.status}</p></div>)}{!upcoming.length && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No upcoming viewings are stored in the database.</p>}</div></article>
      </section>
    </>}
  </DashboardShell>;
}
