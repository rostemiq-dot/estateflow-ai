import { BarChart3, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { DatabasePageSkeleton } from "../components/ui/DatabasePageSkeleton";
import { useToast } from "../components/ui/ToastProvider";
import { listClientsFromDatabase } from "../features/clients/client-api";
import { listDealsFromDatabase } from "../features/deals/deal-api";
import { listPropertiesFromDatabase } from "../features/properties/property-api";
import { listViewingsFromDatabase } from "../features/viewings/viewing-api";
import { listTasksFromDatabase } from "../features/tasks/task-api";
import { listWorkflowCommissions, listWorkflowContracts, listWorkflowPayments } from "../features/workflow/workflow-api";

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const formatIqd = (value: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} IQD`;

export function ReportsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    properties: Awaited<ReturnType<typeof listPropertiesFromDatabase>>;
    clients: Awaited<ReturnType<typeof listClientsFromDatabase>>;
    viewings: Awaited<ReturnType<typeof listViewingsFromDatabase>>;
    deals: Awaited<ReturnType<typeof listDealsFromDatabase>>;
    tasks: Awaited<ReturnType<typeof listTasksFromDatabase>>;
    contracts: Awaited<ReturnType<typeof listWorkflowContracts>>;
    commissions: Awaited<ReturnType<typeof listWorkflowCommissions>>;
    payments: Awaited<ReturnType<typeof listWorkflowPayments>>;
  } | null>(null);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const [properties, clients, viewings, deals, tasks, contracts, commissions, payments] = await Promise.all([
        listPropertiesFromDatabase(),
        listClientsFromDatabase(),
        listViewingsFromDatabase(),
        listDealsFromDatabase({ pageSize: 100 }),
        listTasksFromDatabase(),
        listWorkflowContracts(),
        listWorkflowCommissions(),
        listWorkflowPayments(),
      ]);
      setData({ properties, clients, viewings, deals, tasks, contracts, commissions, payments });
    } catch (value) {
      const message = value instanceof Error ? value.message : "Could not load report data.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const metrics = useMemo(() => {
    if (!data) return null;

    const wonDeals = data.deals.filter((deal) => deal.stage === "Closed Won").length;
    const pipelineValue = data.deals
      .filter((deal) => deal.stage !== "Closed Won" && deal.stage !== "Closed Lost")
      .reduce((sum, deal) => sum + deal.expectedValueMinor / 100, 0);

    const paymentTotals = (currency: "USD" | "IQD") => {
      const schedules = data.payments.filter((item) => item.currency === currency);
      const scheduled = schedules.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const paid = schedules.reduce(
        (sum, item) => sum + item.payments.reduce((inner, payment) => inner + Number(payment.amount || 0), 0),
        0,
      );
      return { scheduled, paid };
    };

    return {
      properties: data.properties.length,
      clients: data.clients.length,
      viewings: data.viewings.filter((item) => item.status !== "CANCELLED").length,
      openTasks: data.tasks.filter((item) => item.status === "TODO" || item.status === "IN_PROGRESS").length,
      wonDeals,
      pipelineValue,
      commissionCount: data.commissions.length,
      contracts: data.contracts.length,
      usd: paymentTotals("USD"),
      iqd: paymentTotals("IQD"),
    };
  }, [data]);

  if (loading) {
    return (
      <DashboardShell>
        <DatabasePageSkeleton cards={4} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">MANAGEMENT INTELLIGENCE · LIVE DATABASE</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Reports</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Reporting is calculated from the PostgreSQL-backed CRM. Legacy browser storage is not used as the source of truth.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-bold"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </section>

      {error && (
        <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {metrics && (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Properties", metrics.properties],
              ["Clients", metrics.clients],
              ["Active viewings", metrics.viewings],
              ["Open tasks", metrics.openTasks],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Won deals" value={String(metrics.wonDeals)} />
            <Metric label="Open pipeline" value={formatUsd(metrics.pipelineValue)} />
            <Metric label="Commissions" value={String(metrics.commissionCount)} />
            <Metric label="Contracts" value={String(metrics.contracts)} />
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-amber-600" />
                <h2 className="text-lg font-bold text-slate-950">Payment health</h2>
              </div>
              <PaymentRow label="USD" scheduled={metrics.usd.scheduled} paid={metrics.usd.paid} format={formatUsd} />
              <PaymentRow label="IQD" scheduled={metrics.iqd.scheduled} paid={metrics.iqd.paid} format={formatIqd} />
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Data source status</h2>
              <div className="mt-5 space-y-3 text-sm">
                <Status text="Properties, clients, viewings, deals and tasks are database-backed." />
                <Status text="Offers, contracts, commissions and payments are database-backed." />
                <p className="rounded-xl bg-slate-50 p-3 font-semibold text-slate-700">
                  Reports no longer use legacy deal, contract or task localStorage values.
                </p>
              </div>
            </article>
          </section>
        </>
      )}
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PaymentRow({
  label,
  scheduled,
  paid,
  format,
}: {
  label: string;
  scheduled: number;
  paid: number;
  format: (value: number) => string;
}) {
  const percentage = scheduled > 0 ? Math.min(100, (paid / scheduled) * 100) : 0;

  return (
    <div className="mt-6">
      <div className="flex justify-between gap-4 text-sm">
        <span className="font-semibold text-slate-500">{label} scheduled / paid</span>
        <strong className="text-right text-slate-900">
          {format(scheduled)} / {format(paid)}
        </strong>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-amber-500" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function Status({ text }: { text: string }) {
  return <p className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800">✓ {text}</p>;
}
