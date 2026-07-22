import { DashboardShell } from "../components/dashboard/DashboardShell";

const metrics = [
  { label: "Active properties", value: "48", detail: "+6 this month" },
  { label: "Active clients", value: "126", detail: "+18 this month" },
  { label: "Today’s viewings", value: "7", detail: "2 need confirmation" },
  { label: "Pipeline value", value: "$184,500", detail: "12 active deals" },
];

const viewings = [
  {
    time: "10:00 AM",
    client: "Aso Karim",
    property: "3-bedroom villa · Italian Village",
    status: "Confirmed",
  },
  {
    time: "1:30 PM",
    client: "Dilan Ahmed",
    property: "Modern apartment · Empire World",
    status: "Needs confirmation",
  },
  {
    time: "5:00 PM",
    client: "Rojin Saeed",
    property: "Family home · Dream City",
    status: "Confirmed",
  },
];

const activity = [
  "New property added in Ankawa",
  "Viewing confirmed with Aso Karim",
  "Client profile updated for Dilan Ahmed",
  "Commission payment received",
];

export function DashboardPage() {
  return (
    <DashboardShell>
      <section>
        <p className="text-sm font-semibold text-amber-700">OVERVIEW</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Your business at a glance
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Manage your properties, clients, viewings, and deals from one smart
          workspace.
        </p>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {metric.value}
            </p>
            <p className="mt-3 text-sm font-medium text-emerald-600">
              {metric.detail}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Today’s viewings
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Keep every client visit organized.
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-semibold text-amber-700 hover:text-amber-800"
            >
              View calendar
            </button>
          </div>

          <div className="mt-6 divide-y divide-slate-100">
            {viewings.map((viewing) => (
              <div
                key={`${viewing.time}-${viewing.client}`}
                className="flex gap-4 py-4 first:pt-0 last:pb-0"
              >
                <p className="w-16 shrink-0 text-sm font-semibold text-slate-950">
                  {viewing.time}
                </p>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-950">
                    {viewing.client}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {viewing.property}
                  </p>
                </div>
                <span
                  className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                    viewing.status === "Confirmed"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {viewing.status}
                </span>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-slate-950 p-6 shadow-sm">
            <p className="text-sm font-semibold text-amber-400">
              QUICK ACTIONS
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              Move your work forward
            </h2>
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                className="rounded-xl bg-amber-400 px-4 py-3 text-left text-sm font-bold text-slate-950 transition hover:bg-amber-300"
              >
                + Add a new property
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-700 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                + Create a client profile
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">
              Recent activity
            </p>
            <div className="mt-4 space-y-4">
              {activity.map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <p className="text-sm leading-6 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </DashboardShell>
  );
}
