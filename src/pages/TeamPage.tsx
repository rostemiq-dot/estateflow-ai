import { Mail, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { DatabasePageSkeleton } from "../components/ui/DatabasePageSkeleton";
import { useToast } from "../components/ui/ToastProvider";
import { listTeamFromDatabase, type DatabaseTeamMember } from "../features/team/team-api";

const labels: Record<DatabaseTeamMember["role"], string> = { OWNER: "Owner", ADMIN: "Admin", AGENT: "Agent" };

export function TeamPage() {
  const toast = useToast();
  const [members, setMembers] = useState<DatabaseTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function reload() {
    setLoading(true);
    setError("");
    try {
      setMembers(await listTeamFromDatabase());
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load team.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((member) => member.isActive).length,
    admins: members.filter((member) => member.role === "OWNER" || member.role === "ADMIN").length,
  }), [members]);

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">AGENCY · DATABASE</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Team</h1>
          <p className="mt-2 text-slate-600">The roster below comes directly from the authenticated agency database.</p>
        </div>
        <button type="button" onClick={() => void reload()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-bold"><RefreshCw size={16}/> Refresh</button>
      </section>

      {error && <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}

      {loading ? <div className="mt-8"><DatabasePageSkeleton /></div> : <>
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[["Members", stats.total], ["Active", stats.active], ["Managers", stats.admins]].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold text-slate-950">{value}</p></div>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-slate-100 px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400"><span>Member</span><span>Role</span><span>Status</span></div>
          {members.map((member) => (
            <div key={member.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
              <div className="min-w-0"><p className="truncate font-bold text-slate-950">{member.email}</p><p className="mt-1 text-xs text-slate-500">Joined {new Date(member.createdAt).toLocaleDateString()}</p></div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold"><ShieldCheck size={13}/>{labels[member.role]}</span>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${member.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{member.isActive ? "Active" : "Inactive"}</span>
            </div>
          ))}
          {!members.length && <div className="p-10 text-center text-sm text-slate-500"><Users className="mx-auto mb-3" size={26}/><p>No team members were found.</p></div>}
        </section>

        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><Mail size={14}/> User invitations and account creation remain managed through Supabase Auth.</div>
      </>}
    </DashboardShell>
  );
}
