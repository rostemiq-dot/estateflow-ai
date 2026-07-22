export function Topbar() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Tuesday, 22 July</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          Good afternoon, Mohammed
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Notifications
        </button>

        <button
          type="button"
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + Add property
        </button>
      </div>
    </header>
  );
}
