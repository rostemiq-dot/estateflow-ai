import type { Task, Prisma } from "@prisma/client";

export type TaskListOptions = {
  agencyId: string;
  assignedUserId?: string;
  status?: Task["status"];
  priority?: Task["priority"];
  search?: string;
  clientId?: string;
  propertyId?: string;
  dealId?: string;
  viewingId?: string;
  sortBy: "createdAt" | "updatedAt" | "dueAt" | "title" | "priority";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
};

export interface TaskRepository {
  list(options: TaskListOptions): Promise<{ records: Task[]; total: number }>;
  findById(agencyId: string, id: string, permittedUserId?: string): Promise<Task | null>;
  create(data: Prisma.TaskUncheckedCreateInput): Promise<Task>;
  update(agencyId: string, id: string, data: Prisma.TaskUpdateManyMutationInput, permittedUserId?: string): Promise<Task | null>;
  softDelete(agencyId: string, id: string, permittedUserId?: string): Promise<boolean>;
  validateRelations(agencyId: string, input: {
    assignedUserId: string;
    createdById: string;
    clientId?: string | null;
    propertyId?: string | null;
    dealId?: string | null;
    viewingId?: string | null;
  }): Promise<{ assignedUser: boolean; creator: boolean; client: boolean; property: boolean; deal: boolean; viewing: boolean }>;
}
