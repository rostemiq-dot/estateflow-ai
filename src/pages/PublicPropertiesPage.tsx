import { BedDouble, Bath, MapPin, Maximize2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { requireSupabase } from "../lib/supabase";

const BUCKET = "property-media";

type PublicMedia = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  displayOrder: number;
  isCover: boolean;
};

type PublicProperty = {
  id: string;
  title: string;
  description: string | null;
  referenceCode: string;
  purpose: "SALE" | "RENT";
  propertyType: string;
  status: "AVAILABLE";
  price: string;
  currency: "USD" | "IQD";
  country: string;
  city: string;
  district: string | null;
  neighborhood: string | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: string | null;
  floor: number | null;
  totalFloors: number | null;
  parkingSpaces: number | null;
  yearBuilt: number | null;
  furnished: boolean;
  media: PublicMedia[];
};

type Response = { data: PublicProperty[] };

async function signedImageUrl(path: string) {
  const { data, error } = await requireSupabase().storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

function formatPrice(value: string, currency: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number) + ` ${currency}`;
}

export function PublicPropertiesPage() {
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<PublicProperty | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<Response>("/api/public/properties")
      .then(async (response) => {
        if (!active) return;
        setProperties(response.data);
        const entries = await Promise.all(
          response.data.map(async (property) => {
            const cover = property.media.find((media) => media.isCover) ?? property.media[0];
            return [property.id, cover ? await signedImageUrl(cover.storagePath) : ""] as const;
          }),
        );
        if (active) setImages(Object.fromEntries(entries));
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Could not load properties."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return properties;
    return properties.filter((property) =>
      [property.title, property.city, property.district, property.neighborhood, property.referenceCode, property.propertyType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [properties, query]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">EstateFlow</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Available Properties</h1>
              <p className="mt-1 text-sm text-slate-500">Browse our currently published properties — no account required.</p>
            </div>
            <label className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search properties..." className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100" />
            </label>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        {loading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /></div> : error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm font-semibold text-rose-700">{error}</div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="text-lg font-bold">No published properties found</p><p className="mt-2 text-sm text-slate-500">Try another search or check back later.</p></div> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((property) => <button key={property.id} type="button" onClick={() => setSelected(property)} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="relative aspect-[4/3] overflow-hidden bg-slate-100">{images[property.id] ? <img src={images[property.id]} alt={property.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">No photo available</div>}<span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">Available</span><span className="absolute bottom-4 left-4 rounded-lg bg-slate-950/80 px-3 py-1.5 text-sm font-bold text-white">{formatPrice(property.price, property.currency)}</span></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">{property.purpose === "SALE" ? "For Sale" : "For Rent"} · {property.referenceCode}</p><h2 className="mt-2 line-clamp-1 text-lg font-bold">{property.title}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={15} />{[property.district, property.city].filter(Boolean).join(", ")}</p><div className="mt-4 flex gap-4 text-xs font-semibold text-slate-500"><span className="flex items-center gap-1"><BedDouble size={15}/>{property.bedrooms ?? "—"}</span><span className="flex items-center gap-1"><Bath size={15}/>{property.bathrooms ?? "—"}</span><span className="flex items-center gap-1"><Maximize2 size={14}/>{property.areaSqm ? `${property.areaSqm} m²` : "—"}</span></div></div></button>)}</div>}
      </section>

      {selected && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 sm:p-8" onClick={() => setSelected(null)}><article className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Property {selected.referenceCode}</p><h2 className="mt-1 text-xl font-bold">{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={20}/></button></div><div className="grid gap-0 md:grid-cols-2"><div className="aspect-square bg-slate-100">{images[selected.id] ? <img src={images[selected.id]} alt={selected.title} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-slate-400">No photo available</div>}</div><div className="p-6 sm:p-8"><p className="text-2xl font-bold">{formatPrice(selected.price, selected.currency)}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><MapPin size={16}/>{selected.address || [selected.district, selected.city, selected.country].filter(Boolean).join(", ")}</p><div className="mt-6 grid grid-cols-3 gap-3">{[["Bedrooms",selected.bedrooms],["Bathrooms",selected.bathrooms],["Area",selected.areaSqm ? `${selected.areaSqm} m²` : null]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold">{value ?? "—"}</p></div>)}</div><p className="mt-6 whitespace-pre-line text-sm leading-6 text-slate-600">{selected.description || "Contact us for more information about this property."}</p><div className="mt-7 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-slate-800">Interested in this property? Contact our agency to arrange a viewing.</div></div></div></article></div>}
    </main>
  );
}
