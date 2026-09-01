import { Archive, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { loadContracts } from "../features/contracts/contract-storage";
import { loadClients } from "../features/clients/client-storage";
import { loadDeals } from "../features/deals/deal-storage";
import { formatMoney } from "../features/deals/deal-utils";
import { loadProperties } from "../features/properties/property-storage";
import { loadTasks } from "../features/tasks/task-storage";
import {
  TEAM_ROLES,
  TEAM_STATUSES,
  type TeamMember,
  type TeamRole,
  type TeamStatus,
} from "../features/team/team-data";
import { getMemberPerformance } from "../features/team/team-metrics";
import {
  createTeamMember,
  loadTeam,
  saveTeam,
} from "../features/team/team-storage";
const field = "min-h-12 rounded-xl border border-slate-200 px-4 text-sm";
export function TeamPage() {
  const [items, setItems] = useState(loadTeam),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState<"All" | TeamStatus>("All"),
    [sort, setSort] = useState("name"),
    [editing, setEditing] = useState<TeamMember | "new" | null>(null),
    [properties] = useState(loadProperties),
    [clients] = useState(loadClients),
    [deals] = useState(() => loadDeals(clients, properties)),
    [contracts] = useState(loadContracts),
    [tasks] = useState(loadTasks);
  const visible = useMemo(
    () =>
      items
        .filter(
          (x) =>
            (status === "All" || x.status === status) &&
            (!search ||
              [x.fullName, x.email, x.phone, x.jobTitle, x.role].some((v) =>
                v.toLowerCase().includes(search.toLowerCase()),
              )),
        )
        .sort((a, b) =>
          sort === "joined"
            ? b.joiningDate.localeCompare(a.joiningDate)
            : sort === "role"
              ? a.role.localeCompare(b.role)
              : a.fullName.localeCompare(b.fullName),
        ),
    [items, search, status, sort],
  );
  const persist = (next: TeamMember[]) => {
    saveTeam(next);
    setItems(next);
  };
  const remove = (m: TeamMember) => {
    if (
      !window.confirm(
        `Delete ${m.fullName}? Existing records keep their saved agent name.`,
      )
    )
      return;
    persist(items.filter((x) => x.id !== m.id));
  };
  return (
    <DashboardShell>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-amber-700">AGENCY STAFF</p>
          <h1 className="mt-2 text-3xl font-bold">Team</h1>
          <p className="mt-2 text-slate-600">
            Local staff records and real workload. Roles here do not provide
            authentication or security permissions.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-5 font-bold"
        >
          <Plus size={18} /> Add member
        </button>
      </section>
      <section className="mt-6 grid gap-3 rounded-2xl bg-white p-4 md:grid-cols-3">
        <label className="relative">
          <Search
            className="absolute left-4 top-3.5 text-slate-400"
            size={18}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-12 w-full rounded-xl border pl-11"
            placeholder="Search team"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "All" | TeamStatus)}
          className={field}
        >
          <option>All</option>
          {TEAM_STATUSES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={field}
        >
          <option value="name">Name</option>
          <option value="role">Role</option>
          <option value="joined">Newest joined</option>
        </select>
      </section>
      <section className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {visible.map((m) => {
          const p = getMemberPerformance(m, deals, contracts, tasks);
          const recentTask = [...tasks]
            .filter((task) => task.responsibleAgent === m.fullName)
            .sort((first, second) =>
              second.updatedAt.localeCompare(first.updatedAt),
            )[0];
          return (
            <article
              key={m.id}
              className="rounded-2xl border bg-white p-5 shadow-sm"
            >
              <button
                onClick={() => setEditing(m)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-amber-100 text-xl font-bold text-amber-800">
                    {m.photo ? (
                      <img
                        src={m.photo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      m.fullName
                        .split(" ")
                        .map((x) => x[0])
                        .join("")
                        .slice(0, 2)
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold">{m.fullName}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {m.jobTitle} · {m.role}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                      {m.status}
                    </span>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                  <div>
                    <b>{p.activeDeals}</b>
                    <p className="text-xs text-slate-500">Active</p>
                  </div>
                  <div>
                    <b>{p.wonDeals}</b>
                    <p className="text-xs text-slate-500">Won</p>
                  </div>
                  <div>
                    <b>{p.overdueTasks}</b>
                    <p className="text-xs text-slate-500">Overdue</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  USD pipeline {formatMoney(p.USD.pipelineMinor, "USD")}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  IQD pipeline {formatMoney(p.IQD.pipelineMinor, "IQD")}
                </p>
                <p className="mt-3 truncate text-xs text-slate-500">
                  Recent work: {recentTask?.title ?? "No assigned activity"}
                </p>
              </button>
              <div className="mt-4 flex gap-2 border-t pt-3">
                <button
                  onClick={() =>
                    persist(
                      items.map((x) =>
                        x.id === m.id
                          ? {
                              ...x,
                              archived: !x.archived,
                              status: x.archived ? "Active" : "Inactive",
                            }
                          : x,
                      ),
                    )
                  }
                  className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-slate-100"
                  aria-label={m.archived ? "Reactivate" : "Archive"}
                >
                  <Archive size={17} />
                </button>
                <button
                  onClick={() => remove(m)}
                  className="grid min-h-11 min-w-11 place-items-center rounded-xl text-rose-600 hover:bg-rose-50"
                  aria-label="Delete"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          );
        })}
      </section>
      {editing && (
        <TeamEditor
          member={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(draft) => {
            if (editing === "new") {
              const created = createTeamMember(draft, items);
              if (!created) {
                window.alert("A team member with this email already exists.");
                return;
              }
              persist([created, ...items]);
            } else
              persist(
                items.map((x) =>
                  x.id === editing.id
                    ? {
                        ...editing,
                        ...draft,
                        updatedAt: new Date().toISOString(),
                      }
                    : x,
                ),
              );
            setEditing(null);
          }}
        />
      )}
    </DashboardShell>
  );
}
function TeamEditor({
  member,
  onClose,
  onSave,
}: {
  member?: TeamMember;
  onClose: () => void;
  onSave: (v: Omit<TeamMember, "id" | "createdAt" | "updatedAt">) => void;
}) {
  const [name, setName] = useState(member?.fullName ?? ""),
    [title, setTitle] = useState(member?.jobTitle ?? ""),
    [phone, setPhone] = useState(member?.phone ?? ""),
    [email, setEmail] = useState(member?.email ?? ""),
    [role, setRole] = useState<TeamRole>(member?.role ?? "Agent"),
    [status, setStatus] = useState<TeamStatus>(member?.status ?? "Active"),
    [joined, setJoined] = useState(
      member?.joiningDate ?? new Date().toISOString().slice(0, 10),
    ),
    [rate, setRate] = useState(
      String((member?.commissionRateBasisPoints ?? 0) / 100),
    ),
    [notes, setNotes] = useState(member?.notes ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      fullName: name.trim(),
      photo: member?.photo ?? "",
      jobTitle: title.trim(),
      phone: phone.trim(),
      email: email.trim(),
      role,
      status,
      joiningDate: joined,
      commissionRateBasisPoints: Math.round(Math.max(0, Number(rate)) * 100),
      notes: notes.trim(),
      archived: member?.archived ?? false,
    });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
      <form
        onSubmit={submit}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"
      >
        <div className="flex justify-between">
          <h2 className="text-xl font-bold">
            {member ? "Edit" : "Add"} team member
          </h2>
          <button type="button" onClick={onClose} className="min-h-11 px-3">
            Close
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className={field}
          />
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Job title"
            className={field}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className={field}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={field}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
            className={field}
          >
            {TEAM_ROLES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TeamStatus)}
            className={field}
          >
            {TEAM_STATUSES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            type="date"
            value={joined}
            onChange={(e) => setJoined(e.target.value)}
            className={field}
          />
          <input
            type="number"
            min="0"
            step=".01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="Commission rate %"
            className={field}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className={`${field} min-h-24 py-3 sm:col-span-2`}
          />
        </div>
        <button className="mt-5 min-h-12 rounded-xl bg-amber-500 px-5 font-bold">
          Save member
        </button>
      </form>
    </div>
  );
}
