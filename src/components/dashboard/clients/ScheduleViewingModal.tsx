import { CalendarDays, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Client } from "../../../features/clients/client-data";
import { getMatchesForClient } from "../../../features/matching/matching";
import type { Property } from "../../../features/properties/property-data";
import type { ViewingDraft } from "../../../features/viewings/viewing-data";

type ScheduleViewingModalProps = {
  client: Client;
  properties: readonly Property[];
  initialPropertyId?: string;
  onClose: () => void;
  onSchedule: (details: ViewingDraft) => void;
};

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

function getTodayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function ScheduleViewingModal({
  client,
  properties,
  initialPropertyId,
  onClose,
  onSchedule,
}: ScheduleViewingModalProps) {
  const matches = useMemo(
    () => getMatchesForClient(client, properties, true),
    [client, properties],
  );
  const availableProperties = matches.map((match) => match.property);
  const defaultPropertyId =
    initialPropertyId ?? availableProperties[0]?.id ?? "";
  const defaultProperty = availableProperties.find(
    (property) => property.id === defaultPropertyId,
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [propertyId, setPropertyId] = useState(defaultPropertyId);
  const [location, setLocation] = useState(
    defaultProperty
      ? `${defaultProperty.district}, ${defaultProperty.location}`
      : "",
  );

  function changeProperty(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
    const property = availableProperties.find(
      (candidate) => candidate.id === nextPropertyId,
    );

    if (property) {
      setLocation(`${property.district}, ${property.location}`);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSchedule({
      clientId: client.id,
      propertyId,
      date,
      time,
      location: location.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <form
        aria-labelledby="schedule-viewing-title"
        aria-modal="true"
        role="dialog"
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="flex gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <CalendarDays aria-hidden="true" size={21} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                New viewing
              </p>
              <h2
                id="schedule-viewing-title"
                className="mt-1 text-2xl font-bold text-slate-950"
              >
                Schedule property visit
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Create a shared viewing for {client.name} and one real property.
              </p>
            </div>
          </div>

          <button
            aria-label="Close viewing form"
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        {availableProperties.length > 0 ? (
          <div className="mt-7 space-y-5">
            <label>
              <span className="text-sm font-semibold text-slate-700">
                Property *
              </span>
              <select
                required
                value={propertyId}
                onChange={(event) => changeProperty(event.target.value)}
                className={inputClassName}
              >
                {matches.map((match) => (
                  <option key={match.property.id} value={match.property.id}>
                    {match.score}% · {match.property.title} ·{" "}
                    {match.property.district}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-400">
                Available properties are ordered by smart-match score.
              </span>
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="text-sm font-semibold text-slate-700">
                  Date *
                </span>
                <input
                  required
                  min={getTodayInputValue()}
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={inputClassName}
                />
              </label>

              <label>
                <span className="text-sm font-semibold text-slate-700">
                  Time *
                </span>
                <input
                  required
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className={inputClassName}
                />
              </label>
            </div>

            <label>
              <span className="text-sm font-semibold text-slate-700">
                Meeting location
              </span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Main gate or meeting point"
                className={inputClassName}
              />
            </label>
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <p className="font-bold text-slate-950">
              No available properties yet
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Add or reopen an available property before scheduling a viewing.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={availableProperties.length === 0}
            className="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Save viewing
          </button>
        </div>
      </form>
    </div>
  );
}
