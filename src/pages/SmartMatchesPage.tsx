import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check, MessageCircle, Search, Sparkles, XCircle } from "lucide-react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { ScheduleViewingModal } from "../components/dashboard/clients/ScheduleViewingModal";
import { listClientsFromDatabase } from "../features/clients/client-api";
import type { Client, ClientPurpose } from "../features/clients/client-data";
import { getAllSmartMatches } from "../features/matching/matching";
import { listPropertiesFromDatabase } from "../features/properties/property-api";
import type { Property } from "../features/properties/property-data";
import { formatPropertyPrice } from "../features/properties/property-utils";
import { createViewingInDatabase } from "../features/viewings/viewing-api";
import type { ViewingDraft } from "../features/viewings/viewing-data";
import { createPropertyShareMessage, createWhatsAppUrl } from "../lib/whatsapp";

type SchedulePair = { clientId: string; propertyId: string };

const strengthStyles = {
  Excellent: "bg-emerald-50 text-emerald-700",
  Strong: "bg-sky-50 text-sky-700",
  Possible: "bg-amber-50 text-amber-800",
  Low: "bg-slate-100 text-slate-600",
} as const;

export function SmartMatchesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [purpose, setPurpose] = useState<"All" | ClientPurpose>("All");
  const [minimumScore, setMinimumScore] = useState(50);
  const [schedulePair, setSchedulePair] = useState<SchedulePair | null>(null);
  const [savingViewing, setSavingViewing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [liveClients, liveProperties] = await Promise.all([
          listClientsFromDatabase(),
          listPropertiesFromDatabase(),
        ]);
        if (cancelled) return;
        setClients(liveClients);
        setProperties(liveProperties);
        setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load live CRM data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const allMatches = useMemo(() => getAllSmartMatches(clients, properties), [clients, properties]);
  const filteredMatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allMatches.filter((match) => {
      const matchesPurpose = purpose === "All" || match.client.purpose === purpose;
      const matchesScore = match.score >= minimumScore;
      const matchesSearch = !term || [
        match.client.name,
        match.client.phone,
        match.property.title,
        match.property.district,
        match.property.propertyType,
      ].some((value) => value.toLowerCase().includes(term));
      return matchesPurpose && matchesScore && matchesSearch;
    });
  }, [allMatches, minimumScore, purpose, search]);

  const matchedClientIds = new Set(allMatches.filter((match) => match.score >= 70).map((match) => match.client.id));
  const excellentMatches = allMatches.filter((match) => match.score >= 85).length;
  const unmatchedClients = clients.length - matchedClientIds.size;
  const schedulingClient = schedulePair ? clients.find((client) => client.id === schedulePair.clientId) : undefined;

  async function scheduleViewing(draft: ViewingDraft) {
    if (!draft.date || !draft.time) {
      setError("Date and time are required.");
      return;
    }
    setSavingViewing(true);
    setError("");
    try {
      const start = new Date(`${draft.date}T${draft.time}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const property = properties.find((item) => item.id === draft.propertyId);
      await createViewingInDatabase({
        propertyId: draft.propertyId,
        clientId: draft.clientId,
        title: `${property?.title ?? "Property"} viewing`,
        description: null,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Baghdad",
        location: draft.location || null,
      });
      setSchedulePair(null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not schedule viewing.");
    } finally {
      setSavingViewing(false);
    }
  }

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">MATCHING ENGINE · LIVE DATABASE</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Smart Matches</h1>
          <p className="mt-2 max-w-3xl text-slate-600">Matches are calculated only from the clients and active properties currently stored in PostgreSQL for your authenticated agency.</p>
        </div>
      </section>

      {error && <p role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      {loading ? (
        <div className="mt-8 rounded-2xl border bg-white p-10 text-center text-slate-500">Loading live clients and properties from the database…</div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Live pairs", allMatches.length, "Database clients × active listings"],
              ["Excellent", excellentMatches, "85% score or higher"],
              ["Matched clients", matchedClientIds.size, "At least one 70%+ fit"],
              ["Need listings", unmatchedClients, "No strong match yet"],
            ].map(([label, value, detail]) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">{detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <label className="relative">
                <span className="text-sm font-semibold text-slate-700">Search matches</span>
                <Search aria-hidden="true" className="pointer-events-none absolute bottom-3.5 left-4 text-slate-400" size={18} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Client, property, area, or type..." className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm" />
              </label>
              <label>
                <span className="text-sm font-semibold text-slate-700">Client purpose</span>
                <select value={purpose} onChange={(event) => setPurpose(event.target.value as "All" | ClientPurpose)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm">
                  <option value="All">Buy and rent</option><option value="Buy">Buy</option><option value="Rent">Rent</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-semibold text-slate-700">Minimum score</span>
                <select value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm">
                  <option value="50">50% · Possible</option><option value="70">70% · Strong</option><option value="85">85% · Excellent</option>
                </select>
              </label>
            </div>
          </section>

          <section className="mt-6">
            <p className="text-sm font-medium text-slate-500">Showing <span className="font-bold text-slate-950">{filteredMatches.length}</span> matching pairs from live database data.</p>
            {filteredMatches.length > 0 ? (
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {filteredMatches.map((match) => (
                  <article key={`${match.client.id}-${match.property.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid sm:grid-cols-[0.72fr_1fr]">
                      {match.property.images?.[0] ? <img src={match.property.images[0]} alt={match.property.title} className="h-52 w-full object-cover sm:h-full" /> : <div className="flex min-h-44 items-end bg-gradient-to-br from-slate-950 via-slate-800 to-amber-700 p-5"><p className="font-bold text-white">{match.property.propertyType} in {match.property.district}</p></div>}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-amber-700">{match.client.name}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{match.property.title}</h2><p className="mt-1 text-sm text-slate-500">{match.property.district} · {match.property.propertyType}</p></div>
                          <span className={`shrink-0 rounded-xl px-3 py-2 text-center ${strengthStyles[match.strength]}`}><span className="block text-[10px] font-bold uppercase">{match.strength}</span><span className="text-xl font-bold">{match.score}%</span></span>
                        </div>
                        <p className="mt-4 text-xl font-bold text-slate-950">{formatPropertyPrice(match.property.price, match.property.currency)}{match.property.purpose === "Rent" && <span className="text-sm font-medium text-slate-500"> / month</span>}</p>
                        <div className="mt-4 grid gap-2">{match.criteria.map((criterion) => <div key={criterion.key} title={criterion.detail} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><span className="flex items-center gap-2 text-xs font-semibold text-slate-700">{criterion.matched ? <Check className="text-emerald-600" size={15}/> : <XCircle className="text-slate-400" size={15}/>} {criterion.label}</span><span className="text-xs font-bold text-slate-500">{criterion.earned}/{criterion.possible}</span></div>)}</div>
                        <div className="mt-5 grid gap-2">
                          <a href={createWhatsAppUrl(match.client.phone, createPropertyShareMessage(match.property, match.client))} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white"><MessageCircle size={16}/>Share with client</a>
                          <button type="button" disabled={savingViewing} onClick={() => setSchedulePair({ clientId: match.client.id, propertyId: match.property.id })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white disabled:opacity-60"><CalendarPlus size={16}/>Schedule viewing</button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Sparkles className="mx-auto text-slate-400" size={32}/><p className="mt-4 text-lg font-bold text-slate-950">No matches at this score</p><p className="mt-2 text-sm text-slate-500">Lower the minimum score, change the search, or add suitable database listings.</p></div>}
          </section>
        </>
      )}

      {schedulePair && schedulingClient && <ScheduleViewingModal client={schedulingClient} properties={properties} initialPropertyId={schedulePair.propertyId} onClose={() => setSchedulePair(null)} onSchedule={(draft) => void scheduleViewing(draft)} />}
    </DashboardShell>
  );
}
