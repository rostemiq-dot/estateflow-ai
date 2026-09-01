export const TASK_STATUSES = [
  "To Do",
  "In Progress",
  "Waiting",
  "Completed",
  "Cancelled",
] as const;
export const TASK_PRIORITIES = ["Low", "Normal", "High", "Urgent"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskHistory = { id: string; text: string; createdAt: string };
export type Task = {
  id: string;
  automationKey?: string;
  automatic: boolean;
  title: string;
  description: string;
  dueAt: string;
  priority: TaskPriority;
  status: TaskStatus;
  responsibleAgent: string;
  clientId?: string;
  propertyId?: string;
  dealId?: string;
  contractId?: string;
  notes: string;
  archived: boolean;
  history: TaskHistory[];
  createdAt: string;
  updatedAt: string;
};
