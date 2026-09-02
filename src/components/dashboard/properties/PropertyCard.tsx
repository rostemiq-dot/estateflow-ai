import { Copy, Eye, ImagePlus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  Property,
  PropertyStatus,
} from "../../../features/properties/property-data";
import { formatPropertyPrice } from "../../../features/properties/property-utils";

type PropertyCardProps = {
  property: Property;
  bestMatchScore: number;
  matchCount: number;
  onView: () => void;
  onEdit: () => void;
  onPhotos: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const statusStyles: Record<PropertyStatus, string> = {
  Available: "bg-emerald-50 text-emerald-700",
  Reserved: "bg-amber-50 text-amber-700",
  "Under offer": "bg-violet-50 text-violet-700",
  Sold: "bg-slate-100 text-slate-600",
  Rented: "bg-sky-50 text-sky-700",
};

export function PropertyCard({
  property,
  bestMatchScore,
  matchCount,
  onView,
  onEdit,
  onPhotos,
  onDuplicate,
  onDelete,
}: PropertyCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const coverImage = property.images?.[0];

  useEffect(() => {
    if (!isMenuOpen) return;

    function closeMenu(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [isMenuOpen]);

  function runAction(action: () => void) {
    setIsMenuOpen(false);
    action();
  }

  return (
    <article className="group min-w-0 max-w-full overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-44 overflow-visible rounded-t-2xl bg-gradient-to-br from-slate-950 via-slate-800 to-amber-700">
        {coverImage && <img src={coverImage} alt="" className="h-full w-full rounded-t-2xl object-cover" />}
        <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/20" />
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-950 shadow-sm backdrop-blur">{property.propertyType}</span>
            <span className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">For {property.purpose.toLowerCase()}</span>
          </div>
        </div>

        <div ref={menuRef} className="absolute right-3 top-3 z-20">
          <button aria-expanded={isMenuOpen} aria-haspopup="menu" aria-label={`Actions for ${property.title}`} type="button" onClick={() => setIsMenuOpen((isOpen) => !isOpen)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200">
            <MoreVertical aria-hidden="true" size={19} />
          </button>
          {isMenuOpen && (
            <div role="menu" className="absolute right-0 top-12 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <button role="menuitem" type="button" onClick={() => runAction(onView)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"><Eye aria-hidden="true" size={17} />View details</button>
              <button role="menuitem" type="button" onClick={() => runAction(onPhotos)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"><ImagePlus aria-hidden="true" size={17} />Manage photos</button>
              <button role="menuitem" type="button" onClick={() => runAction(onEdit)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"><Pencil aria-hidden="true" size={17} />Edit</button>
              <button role="menuitem" type="button" onClick={() => runAction(onDuplicate)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"><Copy aria-hidden="true" size={17} />Duplicate</button>
              <button role="menuitem" type="button" onClick={() => runAction(onDelete)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"><Trash2 aria-hidden="true" size={17} />Delete</button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-b-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-400">{property.id}</p>
            <h2 className="mt-1 truncate text-lg font-bold text-slate-950">{property.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{property.district} · {property.location}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[property.status]}`}>{property.status}</span>
        </div>

        <p className="mt-5 text-2xl font-bold text-slate-950">
          {formatPropertyPrice(property.price, property.currency)}
          {property.purpose === "Rent" && <span className="ms-1 text-sm font-medium text-slate-500">/ month</span>}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-100 py-4 text-center">
          <div><p className="text-sm font-bold text-slate-950">{property.bedrooms || "—"}</p><p className="mt-1 text-xs text-slate-500">Beds</p></div>
          <div><p className="text-sm font-bold text-slate-950">{property.bathrooms}</p><p className="mt-1 text-xs text-slate-500">Baths</p></div>
          <div><p className="text-sm font-bold text-slate-950">{property.areaSqm}m²</p><p className="mt-1 text-xs text-slate-500">Area</p></div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Smart match</p>
            <p className="text-sm font-bold text-emerald-600">{matchCount > 0 ? `${bestMatchScore}% best · ${matchCount} ${matchCount === 1 ? "client" : "clients"}` : "No saved client match"}</p>
          </div>
          <button type="button" onClick={onView} className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-100">Open</button>
        </div>
        <p className="mt-4 text-xs text-slate-400">{property.updatedLabel}</p>
      </div>
    </article>
  );
}
