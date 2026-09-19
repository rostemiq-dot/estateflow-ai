import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

const uuidOrNull = z.uuid().nullable().optional();
const dateOrNull = z.iso.datetime({ offset: true }).nullable().optional();

export const taskParamsSchema = z.object({ taskId: z.uuid() }).strict();

export const createTaskSchema = z.object({
  assignedUserId: z.uuid().optional(),
  clientId: uuidOrNull,
  propertyId: uuidOrNull,
  dealId: uuidOrNull,
  viewingId: uuidOrNull,
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(20000).nullable().optional(),
  status: z.enum(TaskStatus).default(TaskStatus.TODO),
  priority: z.enum(TaskPriority).default(TaskPriority.MEDIUM),
  dueAt: dateOrNull,
}).strict();

export const updateTaskSchema = z.object({
  assignedUserId: z.uuid().optional(),
  clientId: uuidOrNull,
  propertyId: uuidOrNull,
  dealId: uuidOrNull,
  viewingId: uuidOrNull,
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(20000).nullable().optional(),
  status: z.enum(TaskStatus).optional(),
  priority: z.enum(TaskPriority).optional(),
  dueAt: dateOrNull,
}).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  assignedUserId: z.uuid().optional(),
  status: z.enum(TaskStatus).optional(),
  priority: z.enum(TaskPriority).optional(),
  clientId: z.uuid().optional(),
  propertyId: z.uuid().optional(),
  dealId: z.uuid().optional(),
  viewingId: z.uuid().optional(),
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "dueAt", "title", "priority"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
