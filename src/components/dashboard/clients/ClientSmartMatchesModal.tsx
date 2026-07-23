import {
  CalendarPlus,
  Check,
  ChevronDown,
  MessageCircle,
  X,
  XCircle,
} from "lucide-react";
import type { Client } from "../../../features/clients/client-data";
import { getMatchesForClient } from "../../../features/matching/matching";
import type { Property } from "../../../features/properties/property-data";
import { formatPropertyPrice } from "../../../features/properties/property-utils";
import {
  createPropertyShareMessage,
  createWhatsAppUrl,
} from "../../../lib/whatsapp";

type ClientSmartMatchesModalProps = {
  client: Client;
  properties: readonly Property[];
  onClose: () => void;
  onSchedule: (propertyId: string) => void;
};

const strengthStyles = {
  Excellent: "bg-emerald-50 text-emerald-700",
  Strong: "bg-sky-50 text-sky-700",
  Possible: "bg-amber-50 text-amber-800",
  Low: "bg-slate-100 text-slate-600",
} as const;

export function ClientSmartMatchesModal({
  client,
  properties,
  onClose,
  onSchedule,
}: ClientSmartMatchesModalProps) {
  const matches = getMatchesForClient(client, properties, true);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <div
        aria-labelledby="client-matches-title"
        aria-modal="true"
        role="dialog"
        className="mx-auto my-4 min-h-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-5 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
              Smart matches
            </p>
            <h2
              id="client-matches-title"
              className="mt-1 text-2xl font-bold text-slate-950"
            >
              Best properties for {client.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Every score uses purpose, budget, preferred area, property type,
              and bedroom needs. Only available listings appear.
            </p>
          </div>

          <button
            aria-label="Close smart matches"
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          {matches.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {matches.map((match) => (
                <article
                  key={match.property.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {match.property.images?.[0] ? (
                    <img
                      src={match.property.images[0]}
                      alt={match.property.title}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-32 items-end bg-gradient-to-br from-slate-950 via-slate-800 to-amber-700 p-4">
                      <p className="font-bold text-white">
                        {match.property.propertyType} in{" "}
                        {match.property.district}
                      </p>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-400">
                          {match.property.id}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-slate-950">
                          {match.property.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {match.property.district} ·{" "}
                          {match.property.propertyType}
                        </p>
                      </div>

                      <div
                        className={`shrink-0 rounded-xl px-3 py-2 text-center ${strengthStyles[match.strength]}`}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wide">
                          {match.strength}
                        </p>
                        <p className="text-xl font-bold">{match.score}%</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <p className="text-xl font-bold text-slate-950">
                        {formatPropertyPrice(
                          match.property.price,
                          match.property.currency,
                        )}
                        {match.property.purpose === "Rent" && (
                          <span className="text-sm font-medium text-slate-500">
                            {" "}
                            / month
                          </span>
                        )}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {match.property.bedrooms} bedrooms ·{" "}
                        {match.property.bathrooms} bathrooms ·{" "}
                        {match.property.areaSqm} m²
                      </p>
                    </div>

                    <details className="group mt-4 rounded-xl border border-slate-200">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold text-slate-700">
                        Why this score
                        <ChevronDown
                          aria-hidden="true"
                          className="transition group-open:rotate-180"
                          size={17}
                        />
                      </summary>
                      <div className="space-y-3 border-t border-slate-100 p-4">
                        {match.criteria.map((criterion) => (
                          <div
                            key={criterion.key}
                            className="flex items-start gap-3"
                          >
                            {criterion.matched ? (
                              <Check
                                aria-hidden="true"
                                className="mt-0.5 shrink-0 text-emerald-600"
                                size={17}
                              />
                            ) : (
                              <XCircle
                                aria-hidden="true"
                                className="mt-0.5 shrink-0 text-slate-400"
                                size={17}
                              />
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {criterion.label} · {criterion.earned}/
                                {criterion.possible}
                              </p>
                              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                                {criterion.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <a
                        href={createWhatsAppUrl(
                          client.phone,
                          createPropertyShareMessage(match.property, client),
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500"
                      >
                        <MessageCircle aria-hidden="true" size={17} />
                        Share on WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => onSchedule(match.property.id)}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        <CalendarPlus aria-hidden="true" size={17} />
                        Schedule viewing
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <p className="text-lg font-bold text-slate-950">
                No available properties yet
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Add a new available property, then EstateFlow will score it
                automatically for this client.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
