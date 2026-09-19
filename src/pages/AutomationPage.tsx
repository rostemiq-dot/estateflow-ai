import { Bot, CheckCircle2, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { DatabasePageSkeleton } from "../components/ui/DatabasePageSkeleton";
import { useToast } from "../components/ui/ToastProvider";
import { listDealsFromDatabase } from "../features/deals/deal-api";
import { listViewingsFromDatabase } from "../features/viewings/viewing-api";
import { listTasksFromDatabase, createTaskInDatabase } from "../features/tasks/task-api";
import { listWorkflowContracts, listWorkflowPayments } from "../features/workflow/workflow-api";

type Rule = { id: string; name: string; description: string; enabled: boolean };

const defaultRules: Rule[] = [
  { id: "viewing-follow-up", name: "Viewing preparation", description: "Create a task before upcoming scheduled/confirmed viewings.", enabled: true },
  { id: "payment-follow-up", name: "Payment collection", description: "Create a task for pending payment schedules that are due soon.", enabled: true },
  { id: "contract-signing", name: "Contract signing", description: "Create a task for contracts that are ready to sign.", enabled: true },
];

export function AutomationPage() {
  const toast = useToast();
  const [rules, setRules] = useState<Rule[]>(() => {
    try { const raw = window.localStorage.getItem("estateflow-automation-rules"); return raw ? JSON.parse(raw) as Rule[] : defaultRules; } catch { return defaultRules; }
  });
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { window.localStorage.setItem("estateflow-automation-rules", JSON.stringify(rules)); } catch { /* local preferences only */ }
  }, [rules]);

  useEffect(() => { setLoading(false); }, []);

  async function run() {
    if (running) return;
    setRunning(true);
    try {
      const [viewings, deals, contracts, payments, tasks] = await Promise.all([
        listViewingsFromDatabase(),
        listDealsFromDatabase({ pageSize: 100 }),
        listWorkflowContracts(),
        listWorkflowPayments(),
        listTasksFromDatabase(),
      ]);
      const existingTitles = new Set(tasks.map((task) => task.title));
      let created = 0;

      if (rules.find((rule) => rule.id === "viewing-follow-up")?.enabled) {
        for (const viewing of viewings.filter((item) => ["SCHEDULED", "CONFIRMED"].includes(item.status))) {
          const title = `Prepare for viewing · ${viewing.title}`;
          if (existingTitles.has(title)) continue;
          await createTaskInDatabase({ title, description: "Automatically created from a live viewing.", dueAt: new Date(new Date(viewing.startAt).getTime() - 24 * 60 * 60 * 1000).toISOString(), priority: "HIGH", clientId: viewing.clientId, propertyId: viewing.propertyId, dealId: viewing.dealId, viewingId: viewing.id });
          existingTitles.add(title); created++;
        }
      }

      if (rules.find((rule) => rule.id === "payment-follow-up")?.enabled) {
        for (const payment of payments.filter((item) => ["PENDING", "PARTIALLY_PAID", "OVERDUE"].includes(item.status))) {
          const title = `Collect payment · ${payment.label}`;
          if (existingTitles.has(title)) continue;
          const due = new Date(`${payment.dueDate}T09:00:00`);
          await createTaskInDatabase({ title, description: "Automatically created from a live payment schedule.", dueAt: due.toISOString(), priority: "HIGH", dealId: payment.dealId, propertyId: deals.find((deal) => deal.id === payment.dealId)?.propertyId, clientId: deals.find((deal) => deal.id === payment.dealId)?.clientId });
          existingTitles.add(title); created++;
        }
      }

      if (rules.find((rule) => rule.id === "contract-signing")?.enabled) {
        for (const contract of contracts.filter((item) => item.status === "READY_TO_SIGN")) {
          const title = `Arrange contract signing · ${contract.contractNumber}`;
          if (existingTitles.has(title)) continue;
          const deal = deals.find((item) => item.id === contract.dealId);
          await createTaskInDatabase({ title, description: "Automatically created from a live contract.", dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), priority: "HIGH", dealId: contract.dealId, clientId: deal?.clientId, propertyId: deal?.propertyId });
          existingTitles.add(title); created++;
        }
      }

      setLastRun(new Date().toLocaleString());
      toast.success(created ? `${created} database task${created === 1 ? "" : "s"} created.` : "Automation checked live data; no new tasks were needed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Automation could not run.");
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <DashboardShell><DatabasePageSkeleton cards={3} /></DashboardShell>;

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-sm font-semibold text-amber-700">WORKFLOW AUTOMATION · DATABASE</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Automation</h1><p className="mt-2 max-w-3xl text-slate-600">Automation rules are lightweight local preferences, but every generated task is created through the real authenticated database API.</p></div>
        <button disabled={running} type="button" onClick={() => void run()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-bold text-white disabled:opacity-50"><Play size={17}/>{running ? "Running..." : "Run automation"}</button>
      </section>

      {lastRun && <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16}/> Last run: {lastRun}</div>}

      <section className="mt-8 grid gap-4">
        {rules.map((rule) => (
          <article key={rule.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><Bot size={20}/></div><div><h2 className="font-bold text-slate-950">{rule.name}</h2><p className="mt-1 text-sm text-slate-500">{rule.description}</p></div></div>
            <button type="button" onClick={() => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item))} className={`min-h-10 rounded-xl px-4 text-sm font-bold ${rule.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{rule.enabled ? "Enabled" : "Disabled"}</button>
          </article>
        ))}
      </section>

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500"><RefreshCw size={14}/> Automation reads live viewings, deals, contracts, payments and tasks before creating anything.</div>
    </DashboardShell>
  );
}
