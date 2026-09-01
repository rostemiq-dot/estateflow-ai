import { Play, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { loadClients } from "../features/clients/client-storage";
import { loadContracts } from "../features/contracts/contract-storage";
import { loadDeals } from "../features/deals/deal-storage";
import { loadProperties } from "../features/properties/property-storage";
import {
  loadAutomationRules,
  saveAutomationRules,
} from "../features/automation/automation-storage";
import { generateAutomatedTasks } from "../features/tasks/task-automation";
import { loadTasks, saveTasks } from "../features/tasks/task-storage";
import { loadViewings } from "../features/viewings/viewing-storage";
export function AutomationPage() {
  const [rules, setRules] = useState(loadAutomationRules),
    [message, setMessage] = useState("");
  const persist = (next: typeof rules) => {
    saveAutomationRules(next);
    setRules(next);
  };
  const run = () => {
    const properties = loadProperties(),
      clients = loadClients(),
      deals = loadDeals(clients, properties),
      contracts = loadContracts(),
      before = loadTasks(),
      viewings = loadViewings(properties);
    const evaluated = generateAutomatedTasks(
      before,
      viewings,
      deals,
      contracts,
      clients,
      properties,
    );
    const ruleForKey = (key = "") =>
      rules.find((rule) =>
        key.startsWith("viewing:")
          ? rule.id === "viewing-reminder"
          : key.startsWith("offer:")
            ? rule.id === "offer-expiration"
            : key.startsWith("accepted:")
              ? rule.id === "accepted-offer"
              : key.startsWith("payment:")
                ? rule.id === "payment-due"
                : key.startsWith("sign:")
                  ? rule.id === "contract-signing"
                  : false,
      );
    const generated = evaluated.slice(before.length).flatMap((task) => {
      const rule = ruleForKey(task.automationKey);
      if (rule && !rule.enabled) return [];
      if (!rule) return [task];
      const defaultLead =
        rule.id === "viewing-reminder" && rule.leadUnit === "hours" ? 24 : 1;
      const unitMs = rule.leadUnit === "hours" ? 3_600_000 : 86_400_000;
      const adjusted = new Date(task.dueAt);
      adjusted.setTime(
        adjusted.getTime() + (defaultLead - rule.leadTime) * unitMs,
      );
      return [{ ...task, dueAt: adjusted.toISOString().slice(0, 16) }];
    });
    const next = [...before, ...generated];
    saveTasks(next);
    const created = next.length - before.length,
      now = new Date().toISOString();
    persist(
      rules.map((r) => ({
        ...r,
        lastEvaluatedAt: now,
        createdCount: r.createdCount + Math.max(0, created),
        history: [
          {
            id: `AUTO-${now}-${r.id}`,
            text: `Checks ran; ${created} new task records created across enabled rules.`,
            createdAt: now,
          },
          ...r.history,
        ].slice(0, 5),
      })),
    );
    setMessage(`Checks complete. ${Math.max(0, created)} new tasks created.`);
  };
  return (
    <DashboardShell>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-amber-700">LOCAL WORKFLOWS</p>
          <h1 className="mt-2 text-3xl font-bold">Automation Center</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Rules run while EstateFlow is open or when you run checks. This is
            not a cloud background service and sends no email or WhatsApp
            messages.
          </p>
        </div>
        <button
          onClick={run}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-5 font-bold"
        >
          <Play size={17} /> Run checks now
        </button>
      </section>
      {message && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-700"
        >
          {message}
        </p>
      )}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {rules.map((rule) => (
          <article key={rule.id} className="rounded-2xl border bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold">{rule.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {rule.description}
                </p>
              </div>
              <button
                onClick={() =>
                  persist(
                    rules.map((r) =>
                      r.id === rule.id ? { ...r, enabled: !r.enabled } : r,
                    ),
                  )
                }
                aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`}
                className="min-h-11"
              >
                {rule.enabled ? (
                  <ToggleRight className="text-emerald-600" size={34} />
                ) : (
                  <ToggleLeft className="text-slate-400" size={34} />
                )}
              </button>
            </div>
            <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Trigger</dt>
                <dd className="font-semibold">{rule.trigger}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Action</dt>
                <dd className="font-semibold">{rule.action}</dd>
              </div>
            </dl>
            <label className="mt-4 block text-sm font-bold">
              Lead time{" "}
              <input
                type="number"
                min="0"
                value={rule.leadTime}
                onChange={(e) =>
                  persist(
                    rules.map((r) =>
                      r.id === rule.id
                        ? {
                            ...r,
                            leadTime: Math.max(0, Number(e.target.value)),
                          }
                        : r,
                    ),
                  )
                }
                className="ml-2 h-10 w-20 rounded-lg border px-2"
              />{" "}
              {rule.leadUnit}
            </label>
            <p className="mt-3 text-xs text-slate-500">
              Last evaluated:{" "}
              {rule.lastEvaluatedAt
                ? rule.lastEvaluatedAt.slice(0, 16).replace("T", " ")
                : "Not yet"}{" "}
              · Records created: {rule.createdCount}
            </p>
            {rule.history.slice(0, 2).map((h) => (
              <p key={h.id} className="mt-2 text-xs text-slate-500">
                {h.text}
              </p>
            ))}
          </article>
        ))}
      </section>
    </DashboardShell>
  );
}
