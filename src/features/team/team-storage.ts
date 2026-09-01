import {
  TEAM_ROLES,
  TEAM_STATUSES,
  type TeamMember,
  type TeamRole,
  type TeamStatus,
} from "./team-data";
export const TEAM_STORAGE_KEY = "estateflow-team";
const rec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const defaultOwner = (): TeamMember => ({
  id: "TEAM-OWNER",
  fullName: "Mohammed",
  photo: "",
  jobTitle: "Agency Owner",
  phone: "",
  email: "",
  role: "Owner",
  status: "Active",
  joiningDate: "2026-07-01",
  commissionRateBasisPoints: 0,
  notes: "Default local agency owner.",
  archived: false,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
});
export function normalizeTeamMember(v: unknown): TeamMember | null {
  if (!rec(v) || typeof v.id !== "string" || typeof v.fullName !== "string")
    return null;
  const now = new Date().toISOString();
  return {
    id: v.id,
    fullName: v.fullName,
    photo: typeof v.photo === "string" ? v.photo : "",
    jobTitle: typeof v.jobTitle === "string" ? v.jobTitle : "Agent",
    phone: typeof v.phone === "string" ? v.phone : "",
    email: typeof v.email === "string" ? v.email : "",
    role:
      typeof v.role === "string" && TEAM_ROLES.includes(v.role as TeamRole)
        ? (v.role as TeamRole)
        : "Agent",
    status:
      typeof v.status === "string" &&
      TEAM_STATUSES.includes(v.status as TeamStatus)
        ? (v.status as TeamStatus)
        : "Active",
    joiningDate: typeof v.joiningDate === "string" ? v.joiningDate : "",
    commissionRateBasisPoints:
      typeof v.commissionRateBasisPoints === "number"
        ? Math.max(0, Math.trunc(v.commissionRateBasisPoints))
        : 0,
    notes: typeof v.notes === "string" ? v.notes : "",
    archived: v.archived === true,
    createdAt: typeof v.createdAt === "string" ? v.createdAt : now,
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : now,
  };
}
export function loadTeam(): TeamMember[] {
  if (typeof window === "undefined") return [defaultOwner()];
  try {
    const raw = window.localStorage.getItem(TEAM_STORAGE_KEY);
    if (raw === null) return [defaultOwner()];
    const p: unknown = JSON.parse(raw);
    if (!Array.isArray(p)) return [defaultOwner()];
    return p
      .map(normalizeTeamMember)
      .filter((x): x is TeamMember => x !== null);
  } catch {
    return [defaultOwner()];
  }
}
export function saveTeam(v: readonly TeamMember[]) {
  try {
    window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
export function createTeamMember(
  draft: Omit<TeamMember, "id" | "createdAt" | "updatedAt">,
  existing: readonly TeamMember[],
): TeamMember | null {
  if (
    existing.some(
      (x) => x.email && x.email.toLowerCase() === draft.email.toLowerCase(),
    )
  )
    return null;
  const now = new Date().toISOString();
  return {
    ...draft,
    id: `TEAM-${now.replace(/\D/g, "")}`,
    createdAt: now,
    updatedAt: now,
  };
}
