import { Trash2, X } from "lucide-react";
import type { Client } from "../../../features/clients/client-data";

type DeleteClientModalProps = {
  client: Client;
  relatedViewings: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteClientModal({
  client,
  relatedViewings,
  onCancel,
  onConfirm,
}: DeleteClientModalProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <div
        aria-labelledby="delete-client-title"
        aria-modal="true"
        role="alertdialog"
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <Trash2 aria-hidden="true" size={22} />
          </span>
          <button
            aria-label="Cancel deleting client"
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <h2
          id="delete-client-title"
          className="mt-5 text-2xl font-bold text-slate-950"
        >
          Delete {client.name}?
        </h2>
        <p className="mt-3 leading-6 text-slate-600">
          This removes the client profile, their activity history, and{" "}
          {relatedViewings} related{" "}
          {relatedViewings === 1 ? "viewing" : "viewings"} from this browser.
          This cannot be undone.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Keep client
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-500"
          >
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}
