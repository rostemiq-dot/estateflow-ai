import { CalendarClock, Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { loadClients } from "../features/clients/client-storage";
import { loadContracts } from "../features/contracts/contract-storage";
import { loadDeals } from "../features/deals/deal-storage";
import { loadProperties } from "../features/properties/property-storage";
import { generateAutomatedTasks } from "../features/tasks/task-automation";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "../features/tasks/task-data";
import {
  loadTasks,
  saveTasks,
  taskTiming,
} from "../features/tasks/task-storage";
import { loadViewings } from "../features/viewings/viewing-storage";
const field = "min-h-12 rounded-xl border px-4 text-sm";
export function TasksPage() {
  const [clients] = useState(loadClients),
    [properties] = useState(loadProperties),
    [deals] = useState(() => loadDeals(clients, properties)),
    [contracts] = useState(loadContracts),
    [viewings] = useState(() => loadViewings(properties));
  const initial = generateAutomatedTasks(
    loadTasks(),
    viewings,
    deals,
    contracts,
    clients,
    properties,
  );
  saveTasks(initial);
  const [tasks, setTasks] = useState(initial),
    [view, setView] = useState<"list" | "board">("list"),
    [filter, setFilter] = useState("All"),
    [open, setOpen] = useState(false),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [due, setDue] = useState(""),
    [priority, setPriority] = useState<TaskPriority>("Normal"),
    [agent, setAgent] = useState("Mohammed"),
    [clientId, setClientId] = useState(""),
    [propertyId, setPropertyId] = useState(""),
    [dealId, setDealId] = useState(""),
    [contractId, setContractId] = useState(""),
    [notes, setNotes] = useState("");
  const visible = useMemo(
    () =>
      tasks.filter(
        (t) =>
          !t.archived &&
          (filter === "All" ||
            (filter === "Overdue" && taskTiming(t).overdue) ||
            (filter === "Today" && taskTiming(t).today) ||
            (filter === "Upcoming" && taskTiming(t).upcoming) ||
            (filter === "Completed" && t.status === "Completed") ||
            (TASK_PRIORITIES.includes(filter as TaskPriority) &&
              t.priority === filter)),
      ),
    [tasks, filter],
  );
  const persist = (next: Task[]) => {
    saveTasks(next);
    setTasks(next);
  };
  const patch = (task: Task, p: Partial<Task>) => {
    const now = new Date().toISOString();
    persist(
      tasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              ...p,
              history: [
                {
                  id: `H-${now.replace(/\D/g, "")}`,
                  text: `Task updated: ${Object.keys(p).join(", ")}.`,
                  createdAt: now,
                },
                ...t.history,
              ],
              updatedAt: now,
            }
          : t,
      ),
    );
  };
  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !due) return;
    const now = new Date().toISOString();
    persist([
      {
        id: `TASK-${now.replace(/\D/g, "")}`,
        automatic: false,
        title: title.trim(),
        description: description.trim(),
        dueAt: due,
        priority,
        status: "To Do",
        responsibleAgent: agent.trim() || "Mohammed",
        clientId: clientId || undefined,
        propertyId: propertyId || undefined,
        dealId: dealId || undefined,
        contractId: contractId || undefined,
        notes: notes.trim(),
        archived: false,
        history: [{ id: `H-${now}`, text: "Task created.", createdAt: now }],
        createdAt: now,
        updatedAt: now,
      },
      ...tasks,
    ]);
    setOpen(false);
    setTitle("");
    setDescription("");
    setDue("");
  };
  return (
    <DashboardShell>
      <section className="flex justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-700">FOLLOW-UPS</p>
          <h1 className="mt-2 text-3xl font-bold">Tasks</h1>
          <p className="mt-2 text-slate-600">
            Manual and clearly labelled automatic follow-ups connected to live
            records.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex min-h-12 items-center gap-2 self-end rounded-xl bg-amber-500 px-5 font-bold"
        >
          <Plus size={18} /> Add task
        </button>
      </section>
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          "All",
          "Overdue",
          "Today",
          "Upcoming",
          "Completed",
          ...TASK_PRIORITIES,
        ].map((x) => (
          <button
            key={x}
            onClick={() => setFilter(x)}
            className={`min-h-11 rounded-xl px-4 text-sm font-bold ${filter === x ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}
          >
            {x}
          </button>
        ))}
        <button
          onClick={() => setView(view === "list" ? "board" : "list")}
          className="ml-auto min-h-11 rounded-xl bg-white px-4 text-sm font-bold"
        >
          {view === "list" ? "Board view" : "List view"}
        </button>
      </div>
      <section
        className={
          view === "board" ? "mt-5 grid gap-4 xl:grid-cols-5" : "mt-5 space-y-3"
        }
      >
        {view === "board"
          ? TASK_STATUSES.map((status) => (
              <div key={status} className="rounded-2xl bg-slate-200/60 p-3">
                <p className="mb-3 font-bold">
                  {status} · {visible.filter((t) => t.status === status).length}
                </p>
                {visible
                  .filter((t) => t.status === status)
                  .map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      patch={patch}
                      duplicate={() => {
                        const now = new Date().toISOString();
                        persist([
                          {
                            ...t,
                            id: `TASK-${now.replace(/\D/g, "")}`,
                            title: `${t.title} (copy)`,
                            automatic: false,
                            automationKey: undefined,
                            history: [
                              {
                                id: `H-${now}`,
                                text: `Duplicated from ${t.id}.`,
                                createdAt: now,
                              },
                            ],
                            createdAt: now,
                            updatedAt: now,
                          },
                          ...tasks,
                        ]);
                      }}
                      edit={() => {
                        const nextTitle = window.prompt("Task title", t.title);
                        if (nextTitle?.trim())
                          patch(t, { title: nextTitle.trim() });
                      }}
                      reschedule={() => {
                        const nextDue = window.prompt(
                          "New due date/time (YYYY-MM-DDTHH:mm)",
                          t.dueAt,
                        );
                        if (nextDue?.trim())
                          patch(t, { dueAt: nextDue.trim() });
                      }}
                      remove={() =>
                        window.confirm(`Delete ${t.title}?`) &&
                        persist(tasks.filter((x) => x.id !== t.id))
                      }
                    />
                  ))}
              </div>
            ))
          : visible.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                patch={patch}
                duplicate={() => {
                  const now = new Date().toISOString();
                  persist([
                    {
                      ...t,
                      id: `TASK-${now.replace(/\D/g, "")}`,
                      title: `${t.title} (copy)`,
                      automatic: false,
                      automationKey: undefined,
                      history: [
                        {
                          id: `H-${now}`,
                          text: `Duplicated from ${t.id}.`,
                          createdAt: now,
                        },
                      ],
                      createdAt: now,
                      updatedAt: now,
                    },
                    ...tasks,
                  ]);
                }}
                edit={() => {
                  const nextTitle = window.prompt("Task title", t.title);
                  if (nextTitle?.trim()) patch(t, { title: nextTitle.trim() });
                }}
                reschedule={() => {
                  const nextDue = window.prompt(
                    "New due date/time (YYYY-MM-DDTHH:mm)",
                    t.dueAt,
                  );
                  if (nextDue?.trim()) patch(t, { dueAt: nextDue.trim() });
                }}
                remove={() =>
                  window.confirm(`Delete ${t.title}?`) &&
                  persist(tasks.filter((x) => x.id !== t.id))
                }
              />
            ))}
        {!visible.length && (
          <p className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">
            No tasks match this view.
          </p>
        )}
      </section>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
          <form
            onSubmit={create}
            className="w-full max-w-xl rounded-2xl bg-white p-6"
          >
            <h2 className="text-xl font-bold">Create task</h2>
            <div className="mt-5 grid gap-4">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className={field}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className={`${field} min-h-24 py-3`}
              />
              <input
                required
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className={field}
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={field}
              >
                {TASK_PRIORITIES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <input
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                placeholder="Responsible agent"
                className={field}
              />
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={field}
              >
                <option value="">No linked client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className={field}
              >
                <option value="">No linked property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
              <select
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                className={field}
              >
                <option value="">No linked deal</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
              <select
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                className={field}
              >
                <option value="">No linked contract</option>
                {contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.contractNumber}
                  </option>
                ))}
              </select>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                className={`${field} min-h-24 py-3`}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 px-4 font-bold"
              >
                Cancel
              </button>
              <button className="min-h-11 rounded-xl bg-amber-500 px-4 font-bold">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
function TaskCard({
  task,
  patch,
  duplicate,
  edit,
  reschedule,
  remove,
}: {
  task: Task;
  patch: (t: Task, p: Partial<Task>) => void;
  duplicate: () => void;
  edit: () => void;
  reschedule: () => void;
  remove: () => void;
}) {
  return (
    <article className="mb-3 rounded-xl border bg-white p-4">
      <div className="flex justify-between gap-2">
        <div>
          {task.automatic && (
            <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
              Automatic
            </span>
          )}
          <h2 className="mt-2 font-bold">{task.title}</h2>
          <p
            className={`mt-1 text-sm ${taskTiming(task).overdue ? "font-bold text-rose-600" : "text-slate-500"}`}
          >
            {task.dueAt.replace("T", " · ")} · {task.priority}
          </p>
        </div>
        <select
          aria-label="Task status"
          value={task.status}
          onChange={(e) =>
            patch(task, { status: e.target.value as TaskStatus })
          }
          className="h-11 rounded-xl border px-2 text-xs font-bold"
        >
          {TASK_STATUSES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex gap-1">
        <button
          onClick={edit}
          aria-label="Edit"
          className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-slate-100"
        >
          <Pencil size={17} />
        </button>
        <button
          onClick={reschedule}
          aria-label="Reschedule"
          className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-slate-100"
        >
          <CalendarClock size={17} />
        </button>
        <button
          onClick={() => patch(task, { status: "Completed" })}
          aria-label="Complete"
          className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-emerald-50"
        >
          <Check size={17} />
        </button>
        <button
          onClick={duplicate}
          aria-label="Duplicate"
          className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-slate-100"
        >
          <Copy size={17} />
        </button>
        <button
          onClick={() => patch(task, { archived: true })}
          className="min-h-11 rounded-xl px-3 text-xs font-bold"
        >
          Archive
        </button>
        <button
          onClick={remove}
          aria-label="Delete"
          className="grid min-h-11 min-w-11 place-items-center rounded-xl text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </article>
  );
}
