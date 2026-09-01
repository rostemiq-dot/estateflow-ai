import { AlertTriangle, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Property } from "../../../features/properties/property-data";

type DeletePropertyModalProps = {
  property: Property;
  onCancel: () => void;
  onConfirm: () => boolean;
};

export function DeletePropertyModal({
  property,
  onCancel,
  onConfirm,
}: DeletePropertyModalProps) {
  const [error, setError] = useState("");

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  function confirmDelete() {
    if (!onConfirm()) {
      setError("The property could not be deleted. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <section
        aria-labelledby="delete-property-title"
        aria-modal="true"
        role="alertdialog"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle aria-hidden="true" size={23} />
          </span>

          <button
            aria-label="Close delete confirmation"
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <h2
          id="delete-property-title"
          className="mt-5 text-xl font-bold text-slate-950"
        >
          Delete this property?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          <span className="font-bold text-slate-950">{property.title}</span>{" "}
          will be removed from EstateFlow. This cannot be undone.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Keep property
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
          >
            <Trash2 aria-hidden="true" size={17} />
            Delete property
          </button>
        </div>
      </section>
    </div>
  );
}
