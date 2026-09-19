import { Check, CircleAlert, Clock3, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { DatabasePageSkeleton } from "../components/ui/DatabasePageSkeleton";
import { useToast } from "../components/ui/ToastProvider";
import {
  createTaskInDatabase,
  deleteTaskFromDatabase,
  listTasksFromDatabase,
  updateTaskInDatabase,
  type DatabaseTask,
} from "../features/tasks/task-api";

const statuses: Array<{ value: DatabaseTask["status"]; label: string }> = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];
const priorities: Array<{ value: DatabaseTask["priority"]; label: string }> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

function formatDue(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function dueState(task: DatabaseTask) {
  if (!task.dueAt || task.status === "COMPLETED" || task.status === "CANCELLED") return "normal";
  return new Date(task.dueAt) < new Date() ? "overdue" : "normal";
}

export function TasksPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<DatabaseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DatabaseTask["status"] | "ALL">("ALL");
  const [priority, setPriority] = useState<DatabaseTask["priority"] | "ALL">("ALL");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [taskPriority, setTaskPriority] = useState<DatabaseTask["priority"]>("MEDIUM");

  async function reload() {
    setLoading(true);
    setError("");
    try {
      setTasks(await listTasksFromDatabase({
        status: status === "ALL" ? undefined : status,
        priority: priority === "ALL" ? undefined : priority,
        search,
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load tasks.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 150);
    return () => window.clearTimeout(timer);
  }, [status, priority, search]);

  const stats = useMemo(() => ({
    total: tasks.length,
    open: tasks.filter((task) => task.status === "TODO" || task.status === "IN_PROGRESS").length,
    overdue: tasks.filter((task) => dueState(task) === "overdue").length,
    completed: tasks.filter((task) => task.status === "COMPLETED").length,
  }), [tasks]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const created = await createTaskInDatabase({
        title: title.trim(),
        description: description.trim() || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        priority: taskPriority,
      });
      setTasks((current) => [created, ...current]);
      setTitle("");
      setDescription("");
      setDueAt("");
      setTaskPriority("MEDIUM");
      setOpen(false);
      toast.success("Task created.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create task.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(task: DatabaseTask, next: DatabaseTask["status"]) {
    if (busyId || task.status === next) return;
    setBusyId(task.id);
    try {
      const updated = await updateTaskInDatabase(task.id, { status: next });
      setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
      toast.success(next === "COMPLETED" ? "Task completed." : "Task updated.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update task.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId("");
    }
  }

  async function remove(task: DatabaseTask) {
    if (busyId || !window.confirm("Delete this task?")) return;
    setBusyId(task.id);
    try {
      await deleteTaskFromDatabase(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      toast.success("Task deleted.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not delete task.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">WORK MANAGEMENT · DATABASE</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Tasks</h1>
          <p className="mt-2 text-slate-600">Tasks are now shared through the authenticated PostgreSQL backend instead of browser storage.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 font-bold text-slate-950 hover:bg-amber-400">
          <Plus size={18} /> Add task
        </button>
      </section>

      {error && (
        <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={() => void reload()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4">
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total", stats.total],
          ["Open", stats.open],
          ["Overdue", stats.overdue],
          ["Completed", stats.completed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
          <label>
            <span className="text-sm font-semibold text-slate-700">Search</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Task title or description..." className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4" />
          </label>
          <label>
            <span className="text-sm font-semibold text-slate-700">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4">
              <option value="ALL">All statuses</option>
              {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>
            <span className="text-sm font-semibold text-slate-700">Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4">
              <option value="ALL">All priorities</option>
              {priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      {loading ? <div className="mt-8"><DatabasePageSkeleton /></div> : (
        <section className="mt-8 space-y-3">
          {tasks.map((task) => {
            const overdue = dueState(task) === "overdue";
            return (
              <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-950">{task.title}</h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{priorities.find((item) => item.value === task.priority)?.label}</span>
                      {overdue && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"><CircleAlert size={13} /> Overdue</span>}
                    </div>
                    {task.description && <p className="mt-2 text-sm text-slate-600">{task.description}</p>}
                    <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><Clock3 size={14} /> {formatDue(task.dueAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                      <>
                        <button type="button" disabled={busyId === task.id} onClick={() => void changeStatus(task, task.status === "TODO" ? "IN_PROGRESS" : "COMPLETED")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50">
                          <Check size={15} /> {task.status === "TODO" ? "Start" : "Complete"}
                        </button>
                        <button type="button" disabled={busyId === task.id} onClick={() => void changeStatus(task, "CANCELLED")} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold disabled:opacity-50">Cancel</button>
                      </>
                    )}
                    <button type="button" disabled={busyId === task.id} onClick={() => void remove(task)} aria-label="Delete task" className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-rose-200 text-rose-600 disabled:opacity-50"><Trash2 size={16} /></button>
                  </div>
                </div>
              </article>
            );
          })}
          {!tasks.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No tasks match these filters.</div>}
        </section>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
            <form onSubmit={create} className="w-full rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
                <div><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">DATABASE TASK</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Add task</h2></div>
                <button type="button" onClick={() => setOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-slate-100"><X size={19} /></button>
              </div>
              <div className="grid gap-5 p-5 sm:p-7">
                <label><span className="text-sm font-semibold text-slate-700">Title *</span><input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4" /></label>
                <label><span className="text-sm font-semibold text-slate-700">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="text-sm font-semibold text-slate-700">Due date</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4" /></label>
                  <label><span className="text-sm font-semibold text-slate-700">Priority</span><select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value as DatabaseTask["priority"])} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4">{priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-5">
                <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-5 font-bold">Cancel</button>
                <button disabled={saving} type="submit" className="min-h-11 rounded-xl bg-amber-500 px-6 font-bold disabled:opacity-50">{saving ? "Saving..." : "Create task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
