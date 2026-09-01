import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./task-data";
const KEY = "estateflow-tasks";
const rec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
export function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((v) => {
      if (!rec(v) || typeof v.id !== "string" || typeof v.title !== "string")
        return [];
      return [
        {
          id: v.id,
          automationKey:
            typeof v.automationKey === "string" ? v.automationKey : undefined,
          automatic: v.automatic === true,
          title: v.title,
          description: typeof v.description === "string" ? v.description : "",
          dueAt: typeof v.dueAt === "string" ? v.dueAt : "",
          priority:
            typeof v.priority === "string" &&
            TASK_PRIORITIES.includes(v.priority as TaskPriority)
              ? (v.priority as TaskPriority)
              : "Normal",
          status:
            typeof v.status === "string" &&
            TASK_STATUSES.includes(v.status as TaskStatus)
              ? (v.status as TaskStatus)
              : "To Do",
          responsibleAgent:
            typeof v.responsibleAgent === "string"
              ? v.responsibleAgent
              : "Mohammed",
          clientId: typeof v.clientId === "string" ? v.clientId : undefined,
          propertyId:
            typeof v.propertyId === "string" ? v.propertyId : undefined,
          dealId: typeof v.dealId === "string" ? v.dealId : undefined,
          contractId:
            typeof v.contractId === "string" ? v.contractId : undefined,
          notes: typeof v.notes === "string" ? v.notes : "",
          archived: v.archived === true,
          history: Array.isArray(v.history)
            ? (v.history as Task["history"])
            : [],
          createdAt:
            typeof v.createdAt === "string"
              ? v.createdAt
              : new Date().toISOString(),
          updatedAt:
            typeof v.updatedAt === "string"
              ? v.updatedAt
              : new Date().toISOString(),
        },
      ];
    });
  } catch {
    return [];
  }
}
export function saveTasks(items: readonly Task[]) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}
export function taskTiming(task: Task, now = new Date()) {
  const due = new Date(task.dueAt);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(start);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    overdue: !["Completed", "Cancelled"].includes(task.status) && due < start,
    today: due >= start && due < tomorrow,
    upcoming: due >= tomorrow,
  };
}
