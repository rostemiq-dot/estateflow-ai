import { BarChart3, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { DatabasePageSkeleton } from "../components/ui/DatabasePageSkeleton";
import { useToast } from "../components/ui/ToastProvider";
import { listClientsFromDatabase } from "../features/clients/client-api";
import { listDealsFromDatabase } from "../features/deals/deal-api";
import { listPropertiesFromDatabase } from "../features/properties/property-api";
import { listViewingsFromDatabase } from "../features/viewings/viewing-api";
import { listTasksFromDatabase } from "../features/tasks/task-api";
import { listWorkflowCommissions, listWorkflowContracts, listWorkflowPayments } from "../features/workflow/workflow-api";

const money = (value: number, currency: "USD" | "IQD" = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

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
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load report data.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const metrics = useMemo(() => {
    if (!data) return null;
    const won = data.deals.filter((deal) => deal.stage === "Closed Won");
    const pipeline = data.deals.filter((deal) => !["Closed Won", "Closed Lost"].includes(deal.stage));
    const paymentTotals = (currency: "USD" | "IQD") => ({
      scheduled: data.payments.filter((item) => item.currency === currency).reduce((sum, item) => sum + Number(item.amount || 0), 0),
      paid: data.payments.filter((item) => item.currency === currency).reduce((sum, item) => sum + item.payments.reduce((inner, payment) => inner + Number(payment.amount || 0), 0), 0),
    });
    const usd = paymentTotals("USD");
    const iqd = paymentTotals("IQD");
    return {
      properties: data.properties.length,
      clients: data.clients.length,
      viewings: data.viewings.filter((item) => item.status !== "CANCELLED").length,
      openTasks: data.tasks.filter((item) => item.status === "TODO" || item.status === "IN_PROGRESS").length,
      wonDeals: won.length,
      pipelineValue: pipeline.reduce((sum, deal) => sum + deal.expectedValueMinor / 100, 0),
      commissionCount: data.commissions.length,
      usd,
      iqd,
      contracts: data.contracts.length,
    };
  }, [data]);

  if (loading) return <DashboardShell><DatabasePageSkeleton cards={4} /></DashboardShell>;

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-sm font-semibold text-amber-700">MANAGEMENT INTELLIGENCE · LIVE DATABASE</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Reports</h1><p className="mt-2 max-w-3xl text-slate-600">Every figure below is calculated from the same PostgreSQL-backed CRM data used by the operational screens. Browser localStorage is not the reporting source of truth.</p></div>
        <button type="button" onClick={() => void reload()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-bold"><RefreshCw size={16}/> Refresh</button>
      </section>
      {error && <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {metrics && <><section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[["Properties", metrics.properties], ["Clients", metrics.clients], ["Active viewings", metrics.viewings], ["Open tasks", metrics.openTasks]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></div>)}
      </section>
      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Won deals</p><p className="mt-2 text-2xl font-bold">{metrics.wonDeals}</p></div>
        <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Open pipeline</p><p className="mt-2 text-2xl font-bold">{money(metrics.pipelineValue)}</p></div>
        <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Commissions</p><p className="mt-2 text-2xl font-bold">{metrics.commissionCount}</p></div>
        <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Contracts</p><p className="mt-2 text-2xl font-bold">{metrics.contracts}</p></div>
      </section>
      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><BarChart3 className="text-amber-600"/><h2 className="text-lg font-bold">Payment health</h2></div><div className="mt-6 space-y-5"><div><div className="flex justify-between text-sm"><span className="text-slate-500">USD scheduled / paid</span><strong>{money(metrics.usd.scheduled)} / {money(metrics.usd.paid)}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, metrics.usd.scheduled ? (metrics.usd.paid / metrics.usd.scheduled) * 100 : 0)}%` }}/></div></div></div><div><div className="flex justify-between text-sm"><span className="text-slate-500">IQD scheduled / paid</span><strong>{new Intl.NumberFormat("en-US").format(metrics.iqd.scheduled)} / {new Intl.NumberFormat("en-US").format(metrics.iqd.paid)} IQD</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, metrics.iqd.scheduled ? (metrics.iqd.paid / metrics.iqd.scheduled) * 100 : 0)}%` }}/></div></div></div></div></article>
        <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Data source status</h2><div className="mt-5 space-y-3 text-sm"><p className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800">✓ Properties, clients, viewings, deals and tasks: database-backed</p><p className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800">✓ Offers, contracts, commissions and payments: database-backed</p><p className="rounded-xl bg-slate-50 p-3 font-semibold text-slate-700">Reports no longer read legacy deal/contract/task localStorage.</p></div></article>
      </section></>}
    </DashboardShell>
  );
}
