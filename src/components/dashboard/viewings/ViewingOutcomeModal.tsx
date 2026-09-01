import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Client } from "../../../features/clients/client-data";
import type { Property } from "../../../features/properties/property-data";
import {
  VIEWING_OUTCOMES,
  type Viewing,
  type ViewingOutcome,
} from "../../../features/viewings/viewing-data";

type ViewingOutcomeModalProps = {
  viewing: Viewing;
  client?: Client;
  property?: Property;
  onClose: () => void;
  onSave: (outcome: ViewingOutcome, notes: string) => void;
};

const outcomeStyles: Record<ViewingOutcome, string> = {
  Interested: "border-emerald-300 bg-emerald-50 text-emerald-800",
  Considering: "border-amber-300 bg-amber-50 text-amber-800",
  "Not interested": "border-slate-300 bg-slate-50 text-slate-700",
  "Offer made": "border-violet-300 bg-violet-50 text-violet-800",
};

export function ViewingOutcomeModal({
  viewing,
  client,
  property,
  onClose,
  onSave,
}: ViewingOutcomeModalProps) {
  const [outcome, setOutcome] = useState<ViewingOutcome>(
    viewing.outcome ?? "Interested",
  );
  const [notes, setNotes] = useState(viewing.outcomeNotes ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(outcome, notes.trim());
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <form
        aria-labelledby="viewing-outcome-title"
        aria-modal="true"
        role="dialog"
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
              Viewing result
            </p>
            <h2
              id="viewing-outcome-title"
              className="mt-1 text-2xl font-bold text-slate-950"
            >
              Record the outcome
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {client?.name ?? "Client"} · {property?.title ?? "Property"}
            </p>
          </div>
          <button
            aria-label="Close outcome form"
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <fieldset className="mt-7">
          <legend className="text-sm font-semibold text-slate-700">
            Client response
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {VIEWING_OUTCOMES.map((viewingOutcome) => (
              <button
                key={viewingOutcome}
                type="button"
                aria-pressed={outcome === viewingOutcome}
                onClick={() => setOutcome(viewingOutcome)}
                className={`min-h-12 rounded-xl border px-3 text-sm font-bold transition ${
                  outcome === viewingOutcome
                    ? outcomeStyles[viewingOutcome]
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {viewingOutcome}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-700">
            Outcome notes
          </span>
          <textarea
            rows={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What did the client like, dislike, or ask for next?"
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />
        </label>

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
            className="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Save outcome
          </button>
        </div>
      </form>
    </div>
  );
}
