import { Bath, BedDouble, Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Filter, Heart, Home, MapPin, Maximize2, Moon, Phone, Search, Share2, SlidersHorizontal, Sun, Users, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import { requireSupabase } from "../lib/supabase";

const BUCKET = "property-media";
const SIGNED_URL_TTL = 60 * 60;

type PublicMedia = { id: string; storagePath: string; fileName: string; mimeType: string; displayOrder: number; isCover: boolean };
type PublicProperty = {
  id: string; title: string; description: string | null; referenceCode: string; purpose: "SALE" | "RENT"; propertyType: string; status: "AVAILABLE";
  price: string; currency: "USD" | "IQD"; country: string; city: string; district: string | null; neighborhood: string | null; address: string | null;
  bedrooms: number | null; bathrooms: number | null; areaSqm: string | null; floor: number | null; totalFloors: number | null;
  parkingSpaces: number | null; yearBuilt: number | null; furnished: boolean; media: PublicMedia[];
};
type GalleryImage = { id: string; url: string; isCover: boolean };
type PropertiesResponse = { data: PublicProperty[] };
type ViewingRequestResponse = { data: { message: string; viewingId: string; clientId: string } };

function formatPrice(value: string, currency: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number)} ${currency}`;
}
function locationLabel(property: PublicProperty) { return [property.district, property.neighborhood, property.city].filter(Boolean).join(", "); }
function orderedMedia(media: PublicMedia[]) { return [...media].sort((a, b) => a.isCover !== b.isCover ? (a.isCover ? -1 : 1) : a.displayOrder - b.displayOrder); }
async function signPaths(paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  try {
    const { data, error } = await requireSupabase().storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    if (error || !data) return new Map<string, string>();
    return new Map(paths.map((path, index) => [path, data[index]?.signedUrl ?? ""]));
  } catch { return new Map<string, string>(); }
}

export function PublicPropertiesPage() {
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [selected, setSelected] = useState<PublicProperty | null>(null);
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState<"ALL" | "SALE" | "RENT">("ALL");
  const [type, setType] = useState("ALL");
  const [sort, setSort] = useState<"featured" | "newest" | "price-low" | "price-high">("featured");
  const [loading, setLoading] = useState(true);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [darkMode, setDarkMode] = useState(false);
  const [showViewingForm, setShowViewingForm] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", date: "", time: "", message: "", website: "" });

  useEffect(() => {
    let active = true;
    apiFetch<PropertiesResponse>("/api/public/properties").then(async (response) => {
      if (!active) return;
      setProperties(response.data);
      const entries = response.data.map((property) => ({ id: property.id, path: orderedMedia(property.media)[0]?.storagePath ?? "" })).filter((entry) => entry.path);
      const signed = await signPaths(entries.map((entry) => entry.path));
      if (active) setCoverUrls(Object.fromEntries(entries.map((entry) => [entry.id, signed.get(entry.path) ?? ""])));
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load properties."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("estateflow-public-favorites") ?? "[]");
      if (Array.isArray(stored)) setFavorites(new Set(stored.filter((value): value is string => typeof value === "string")));
      setDarkMode(localStorage.getItem("estateflow-public-theme") === "dark");
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { localStorage.setItem("estateflow-public-favorites", JSON.stringify([...favorites])); }, [favorites]);
  useEffect(() => { localStorage.setItem("estateflow-public-theme", darkMode ? "dark" : "light"); }, [darkMode]);
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeProperty(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const propertyTypes = useMemo(() => [...new Set(properties.map((property) => property.propertyType).filter(Boolean))].sort(), [properties]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = properties.filter((property) => {
      if (purpose !== "ALL" && property.purpose !== purpose) return false;
      if (type !== "ALL" && property.propertyType !== type) return false;
      if (!needle) return true;
      return [property.title, property.city, property.district, property.neighborhood, property.referenceCode, property.propertyType, property.address].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
    return [...result].sort((a, b) => sort === "price-low" ? Number(a.price) - Number(b.price) : sort === "price-high" ? Number(b.price) - Number(a.price) : sort === "newest" ? b.id.localeCompare(a.id) : (coverUrls[b.id] ? 1 : 0) - (coverUrls[a.id] ? 1 : 0));
  }, [properties, query, purpose, type, sort, coverUrls]);

  async function openProperty(property: PublicProperty) {
    setSelected(property); setActiveGalleryIndex(0); setGalleryLoading(true); setShowViewingForm(false); setRequestSent(false); setRequestError("");
    try {
      const media = orderedMedia(property.media); const signed = await signPaths(media.map((item) => item.storagePath));
      setGallery(media.map((item) => ({ id: item.id, url: signed.get(item.storagePath) ?? "", isCover: item.isCover })).filter((item) => item.url));
    } finally { setGalleryLoading(false); }
  }
  function closeProperty() { setSelected(null); setGallery([]); setActiveGalleryIndex(0); setShowViewingForm(false); }
  function toggleFavorite(id: string) { setFavorites((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; }); }
  function clearFilters() { setQuery(""); setPurpose("ALL"); setType("ALL"); setSort("featured"); }
  async function shareProperty(property: PublicProperty) {
    const url = `${window.location.origin}${window.location.pathname}?property=${encodeURIComponent(property.id)}`;
    try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copy property link", url); }
  }
  async function submitViewingRequest(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setRequestLoading(true); setRequestError("");
    try {
      await apiFetch<ViewingRequestResponse>(`/api/public/properties/${selected.id}/viewing-request`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name, phone: form.phone, whatsapp: form.whatsapp, preferredDate: form.date, preferredTime: form.time,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", message: form.message, website: form.website,
        }),
      });
      setRequestSent(true); setRequestError("");
      setForm({ name: "", phone: "", whatsapp: "", date: "", time: "", message: "", website: "" });
    } catch (reason) { setRequestError(reason instanceof Error ? reason.message : "We could not send your request. Please try again."); }
    finally { setRequestLoading(false); }
  }

  const currentImage = gallery[activeGalleryIndex]?.url || (selected ? coverUrls[selected.id] : "");
  const shell = darkMode ? "bg-slate-950 text-slate-100" : "bg-[#f7f7f5] text-slate-950";
  const card = darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white";
  const muted = darkMode ? "text-slate-400" : "text-slate-500";
  const soft = darkMode ? "bg-slate-800/80" : "bg-slate-50";

  return <main className={`min-h-screen transition-colors duration-300 ${shell}`}>
    <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${darkMode ? "border-slate-800/80 bg-slate-950/90" : "border-slate-200/80 bg-white/95"}`}><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-amber-400"><Building2 size={20}/></div><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-600">EstateFlow</p><p className="text-base font-black">Property Collection</p></div></div><button type="button" onClick={() => setDarkMode((value) => !value)} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${darkMode ? "border-slate-700 bg-slate-900 text-slate-200" : "border-slate-200 bg-white text-slate-700"}`} aria-label="Toggle appearance">{darkMode ? <Sun size={17}/> : <Moon size={17}/>}<span className="hidden sm:inline">{darkMode ? "Light mode" : "Night mode"}</span></button></div></header>
    <section className="bg-slate-950"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20"><p className="text-xs font-black uppercase tracking-[.24em] text-amber-400">Curated real estate · Kurdistan</p><h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">Find a place that feels like home.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Explore available properties, view real photos, compare the details that matter, and request a private viewing — no account required.</p><div className="mt-8 rounded-2xl border border-white/10 bg-white p-2 shadow-2xl sm:flex"><label className="relative flex flex-1 items-center"><Search className="absolute left-4 text-slate-400" size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, area, district or reference..." className="h-12 w-full rounded-xl pl-11 pr-4 text-sm font-medium text-slate-900 outline-none" aria-label="Search properties"/></label><button type="button" onClick={() => setShowFilters((value) => !value)} className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 sm:mt-0 sm:w-auto"><SlidersHorizontal size={17}/> Filters</button></div>{showFilters && <div className="mt-3 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-3"><label><span className="text-xs font-bold text-slate-500">Purpose</span><select value={purpose} onChange={(event) => setPurpose(event.target.value as typeof purpose)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900"><option value="ALL">All properties</option><option value="SALE">For sale</option><option value="RENT">For rent</option></select></label><label><span className="text-xs font-bold text-slate-500">Type</span><select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900"><option value="ALL">All types</option>{propertyTypes.map((value) => <option key={value}>{value}</option>)}</select></label><label><span className="text-xs font-bold text-slate-500">Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div>}</div></section>
    <section className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-amber-600">LIVE COLLECTION</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">Available properties</h2></div><p className={`text-sm font-semibold ${muted}`}>{filtered.length} {filtered.length === 1 ? "property" : "properties"}</p></div>
      {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((item) => <div key={item} className={`h-[390px] animate-pulse rounded-3xl ${darkMode ? "bg-slate-900" : "bg-slate-200"}`}/>)</div> : error ? <div className="rounded-3xl border border-rose-300 bg-rose-50 p-10 text-center"><p className="font-bold text-rose-800">We couldn't load the collection.</p><p className="mt-2 text-sm text-rose-700">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Try again</button></div> : filtered.length === 0 ? <div className={`rounded-3xl border border-dashed p-12 text-center ${card}`}><Filter className="mx-auto text-slate-400" size={24}/><p className="mt-4 text-lg font-black">No properties match your search</p><p className={`mt-2 text-sm ${muted}`}>Try a different area, purpose, or property type.</p><button type="button" onClick={clearFilters} className="mt-5 text-sm font-black text-amber-600">Clear filters</button></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((property) => { const image = coverUrls[property.id]; const favorite = favorites.has(property.id); return <article key={property.id} className={`group overflow-hidden rounded-3xl border shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${card}`}><div className={`relative aspect-[4/3] overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}><button type="button" onClick={() => void openProperty(property)} className="absolute inset-0 z-0 h-full w-full text-left">{image ? <img src={image} alt={property.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/> : <div className="flex h-full items-center justify-center"><Home className="text-slate-300" size={40}/></div>}</button><div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-4"><span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black uppercase text-slate-900 shadow-sm">{property.purpose === "SALE" ? "For sale" : "For rent"}</span><button type="button" aria-label={favorite ? "Remove from favorites" : "Save property"} onClick={() => toggleFavorite(property.id)} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm"><Heart size={18} fill={favorite ? "currentColor" : "none"}/></button></div><div className="pointer-events-none absolute bottom-4 left-4 rounded-xl bg-slate-950/90 px-3.5 py-2 text-sm font-black text-white">{formatPrice(property.price, property.currency)}</div>{property.media.length > 1 && <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl bg-black/65 px-2.5 py-1.5 text-xs font-bold text-white">{property.media.length} photos</div>}</div><button type="button" onClick={() => void openProperty(property)} className="w-full p-5 text-left"><p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-600">{property.referenceCode} · {property.propertyType}</p><h3 className="mt-2 line-clamp-2 min-h-[3.5rem] text-lg font-black leading-7">{property.title}</h3><p className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${muted}`}><MapPin size={15}/>{locationLabel(property) || "Location on request"}</p><div className={`mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-xs font-bold ${darkMode ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-600"}`}><span className="flex items-center gap-1.5"><BedDouble size={16}/>{property.bedrooms ?? "—"}</span><span className="flex items-center gap-1.5"><Bath size={16}/>{property.bathrooms ?? "—"}</span><span className="flex items-center gap-1.5"><Maximize2 size={15}/>{property.areaSqm ? `${property.areaSqm} m²` : "—"}</span></div></button></article>; })}</div>}
    </section>
    <footer className={`border-t ${darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"}`}><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><p className="font-black">EstateFlow</p><p className={`text-sm ${muted}`}>Real properties. Clear information. Better decisions.</p></div><p className={`text-xs ${muted}`}>Public property portal · No account required</p></div></footer>

    {selected && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6" onClick={closeProperty} role="dialog" aria-modal="true" aria-label={selected.title}><article className={`mx-auto max-w-6xl overflow-hidden rounded-3xl shadow-2xl ${darkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-950"}`} onClick={(event) => event.stopPropagation()}><div className={`flex items-center justify-between border-b px-5 py-4 sm:px-7 ${darkMode ? "border-slate-800" : "border-slate-200"}`}><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-600">{selected.referenceCode} · {selected.propertyType}</p><h2 className="truncate text-xl font-black sm:text-2xl">{selected.title}</h2></div><button type="button" onClick={closeProperty} className={`flex h-10 w-10 items-center justify-center rounded-full ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`} aria-label="Close"><X size={21}/></button></div><div className="grid lg:grid-cols-[1.2fr_.8fr]"><div className="bg-slate-950 p-3 sm:p-5"><div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">{currentImage ? <img src={currentImage} alt={selected.title} className="h-full w-full object-contain"/> : <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">{galleryLoading ? "Loading photos…" : "No photo available"}</div>}{gallery.length > 1 && <><button type="button" onClick={() => setActiveGalleryIndex((index) => (index - 1 + gallery.length) % gallery.length)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900" aria-label="Previous photo"><ChevronLeft size={20}/></button><button type="button" onClick={() => setActiveGalleryIndex((index) => (index + 1) % gallery.length)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900" aria-label="Next photo"><ChevronRight size={20}/></button></>}</div>{gallery.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{gallery.map((image, index) => <button key={image.id} type="button" onClick={() => setActiveGalleryIndex(index)} className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg ${index === activeGalleryIndex ? "ring-2 ring-amber-400" : "opacity-70"}`}><img src={image.url} alt="" className="h-full w-full object-cover"/>{image.isCover && <span className="absolute bottom-1 left-1 rounded bg-slate-950/80 px-1.5 py-0.5 text-[8px] font-black text-white">Cover</span>}</button>)}</div>}</div>
      <div className="max-h-[78vh] overflow-y-auto p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-3xl font-black">{formatPrice(selected.price, selected.currency)}</p><p className={`mt-2 flex items-start gap-2 text-sm leading-6 ${muted}`}><MapPin size={17} className="mt-0.5 shrink-0"/>{selected.address || locationLabel(selected) || selected.country}</p></div><div className="flex gap-2"><button type="button" onClick={() => void shareProperty(selected)} className={`flex h-11 w-11 items-center justify-center rounded-full border ${darkMode ? "border-slate-700" : "border-slate-200"}`} aria-label="Share property"><Share2 size={18}/></button><button type="button" onClick={() => toggleFavorite(selected.id)} className={`flex h-11 w-11 items-center justify-center rounded-full border ${darkMode ? "border-slate-700" : "border-slate-200"}`} aria-label="Save property"><Heart size={19} fill={favorites.has(selected.id) ? "currentColor" : "none"}/></button></div></div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className={`rounded-2xl p-3 ${soft}`}><p className={`flex items-center gap-1.5 text-xs font-bold ${muted}`}><BedDouble size={14}/>Bedrooms</p><p className="mt-1.5 font-black">{selected.bedrooms ?? "—"}</p></div><div className={`rounded-2xl p-3 ${soft}`}><p className={`flex items-center gap-1.5 text-xs font-bold ${muted}`}><Bath size={14}/>Bathrooms</p><p className="mt-1.5 font-black">{selected.bathrooms ?? "—"}</p></div><div className={`rounded-2xl p-3 ${soft}`}><p className={`flex items-center gap-1.5 text-xs font-bold ${muted}`}><Maximize2 size={14}/>Area</p><p className="mt-1.5 font-black">{selected.areaSqm ? `${selected.areaSqm} m²` : "—"}</p></div><div className={`rounded-2xl p-3 ${soft}`}><p className={`flex items-center gap-1.5 text-xs font-bold ${muted}`}><Building2 size={14}/>Floor</p><p className="mt-1.5 font-black">{selected.floor ?? "—"}</p></div><div className={`rounded-2xl p-3 ${soft}`}><p className={`flex items-center gap-1.5 text-xs font-bold ${muted}`}><Home size={14}/>Parking</p><p className="mt-1.5 font-black">{selected.parkingSpaces ?? "—"}</p></div><div className={`rounded-2xl p-3 ${soft}`}><p className={`flex items-center gap-1.5 text-xs font-bold ${muted}`}><CalendarDays size={14}/>Built</p><p className="mt-1.5 font-black">{selected.yearBuilt ?? "—"}</p></div></div>{selected.furnished && <p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-600"><Check size={17}/> Furnished</p>}<p className="mt-7 text-sm font-black uppercase tracking-wider">About this property</p><p className={`mt-3 whitespace-pre-line text-sm leading-7 ${muted}`}>{selected.description || "Contact our team for more information about this property."}</p>
        {!showViewingForm && !requestSent && <div className={`mt-7 rounded-2xl border p-5 ${darkMode ? "border-amber-900/60 bg-amber-950/20" : "border-amber-200 bg-amber-50"}`}><p className="font-black">Interested in this property?</p><p className={`mt-1 text-sm leading-6 ${muted}`}>Choose a preferred date and time and our team will contact you to confirm a private viewing.</p><button type="button" onClick={() => setShowViewingForm(true)} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white"><CalendarDays size={17}/> Request a private viewing</button></div>}
        {requestSent && <div className="mt-7 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={24}/></div><p className="mt-4 text-lg font-black text-emerald-900">Viewing request sent successfully</p><p className="mt-2 text-sm leading-6 text-emerald-800">Thank you. Our team has received your request and will contact you shortly to confirm the appointment.</p></div>}
        {showViewingForm && !requestSent && <form onSubmit={submitViewingRequest} className={`mt-7 rounded-2xl border p-5 ${darkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-slate-50"}`}><div className="flex items-start justify-between gap-4"><div><p className="font-black">Request a private viewing</p><p className={`mt-1 text-xs ${muted}`}>No account needed. We only use your contact details to arrange the viewing.</p></div><button type="button" onClick={() => setShowViewingForm(false)} className={muted} aria-label="Close form"><X size={18}/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-xs font-bold">Full name *</span><input required minLength={2} maxLength={201} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`} placeholder="Your full name"/></label><label><span className="text-xs font-bold">Phone number *</span><input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`} placeholder="+964 ..." inputMode="tel"/></label><label><span className="text-xs font-bold">WhatsApp number</span><input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`} placeholder="If different" inputMode="tel"/></label><label><span className="text-xs font-bold">Preferred date *</span><input required type="date" min={new Date().toISOString().slice(0,10)} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}/></label><label><span className="text-xs font-bold">Preferred time *</span><input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}/></label><label className="sm:col-span-2"><span className="text-xs font-bold">Message</span><textarea maxLength={2000} rows={3} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className={`mt-1 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`} placeholder="Anything you'd like our agent to know?"/></label><input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} className="hidden" aria-hidden="true"/></div>{requestError && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{requestError}</p>}<button disabled={requestLoading} type="submit" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60">{requestLoading ? "Sending request…" : "Send viewing request"}</button><p className={`mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] ${muted}`}><Users size={13}/> Our team will contact you to confirm availability.</p></form>}
      </div></div></article></div>}
  </main>;
}
