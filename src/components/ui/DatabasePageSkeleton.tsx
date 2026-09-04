export function DatabasePageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="mt-8 space-y-6" aria-busy="true" aria-label="Loading database content">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-9 w-20 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <article key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-40 animate-pulse bg-slate-100" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mt-8 space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-6 w-6 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 h-4 w-20 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-9 w-16 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-52 animate-pulse rounded bg-slate-100" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }, (_, row) => <div key={row} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
