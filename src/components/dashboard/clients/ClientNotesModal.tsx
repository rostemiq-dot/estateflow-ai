import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type {
  Activity,
  ActivityType,
} from "../../../features/activities/activity-data";
import type { Client } from "../../../features/clients/client-data";
import type { Property } from "../../../features/properties/property-data";

type ClientNotesModalProps = {
  client: Client;
  properties: readonly Property[];
  onClose: () => void;
  onSave: (
    note: Pick<Activity, "type" | "text"> &
      Partial<Pick<Activity, "propertyId">>,
  ) => void;
};

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

export function ClientNotesModal({
  client,
  properties,
  onClose,
  onSave,
}: ClientNotesModalProps) {
  const [type, setType] = useState<ActivityType>("Call");
  const [text, setText] = useState("");
  const [propertyId, setPropertyId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSave({
      type,
      text: text.trim(),
      propertyId: propertyId || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <form
        aria-labelledby="client-note-title"
        aria-modal="true"
        role="dialog"
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
              Client activity
            </p>
            <h2
              id="client-note-title"
              className="mt-1 text-2xl font-bold text-slate-950"
            >
              Add note
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Save a call, WhatsApp message, meeting, or important detail for{" "}
              {client.name}.
            </p>
          </div>

          <button
            aria-label="Close note form"
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="mt-7 space-y-5">
          <label>
            <span className="text-sm font-semibold text-slate-700">
              Activity type
            </span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ActivityType)}
              className={inputClassName}
            >
              <option value="Call">Phone call</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Meeting">Meeting</option>
              <option value="General">General note</option>
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Related property
            </span>
            <select
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              className={inputClassName}
            >
              <option value="">No specific property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title} · {property.district}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-400">
              Linking a property also shows this note in its activity timeline.
            </span>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">Note *</span>
            <textarea
              required
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Example: Client likes the Empire World apartment. Send two more options tomorrow."
              rows={5}
              className={`${inputClassName} resize-y`}
            />
          </label>
        </div>

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
            Save activity
          </button>
        </div>
      </form>
    </div>
  );
}
