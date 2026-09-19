import { describe, expect, it, vi } from "vitest";
import { TaskStatus, UserRole } from "@prisma/client";
import { TaskService } from "../services/task.service.js";
import type { TaskRepository } from "../repositories/task.repository.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";

const actor: AuthenticatedUser = { id: "11111111-1111-4111-8111-111111111111", email: "agent@example.com", agencyId: "22222222-2222-4222-8222-222222222222", role: UserRole.AGENT };

const baseTask = {
  id: "33333333-3333-4333-8333-333333333333",
  agencyId: actor.agencyId,
  assignedUserId: actor.id,
  createdById: actor.id,
  clientId: null,
  propertyId: null,
  dealId: null,
  viewingId: null,
  title: "Call client",
  description: null,
  status: TaskStatus.TODO,
  priority: "MEDIUM" as const,
  dueAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function repository(overrides: Partial<TaskRepository> = {}): TaskRepository {
  return {
    list: vi.fn(async () => ({ records: [baseTask], total: 1 })),
    findById: vi.fn(async () => baseTask),
    create: vi.fn(async (data) => ({ ...baseTask, ...data })),
    update: vi.fn(async (_agency, _id, data) => ({ ...baseTask, ...data })),
    softDelete: vi.fn(async () => true),
    validateRelations: vi.fn(async () => ({ assignedUser: true, creator: true, client: true, property: true, deal: true, viewing: true })),
    ...overrides,
  };
}

describe("TaskService", () => {
  it("scopes agents to their own tasks", async () => {
    const repo = repository();
    const service = new TaskService(repo);
    await service.list(actor, { page: 1, pageSize: 20, sortBy: "updatedAt", sortOrder: "desc" });
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ agencyId: actor.agencyId, assignedUserId: actor.id }));
  });

  it("rejects cross-agent assignment", async () => {
    const service = new TaskService(repository());
    await expect(service.create(actor, {
      title: "Unauthorized",
      assignedUserId: "44444444-4444-4444-8444-444444444444",
      status: TaskStatus.TODO,
      priority: "MEDIUM",
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("sets completedAt when completing a task", async () => {
    const repo = repository();
    const service = new TaskService(repo);
    await service.update(actor, baseTask.id, { status: TaskStatus.COMPLETED });
    expect(repo.update).toHaveBeenCalledWith(
      actor.agencyId,
      baseTask.id,
      expect.objectContaining({ status: TaskStatus.COMPLETED, completedAt: expect.any(Date) }),
      actor.id,
    );
  });

  it("prevents reopening terminal tasks", async () => {
    const repo = repository({ findById: vi.fn(async () => ({ ...baseTask, status: TaskStatus.COMPLETED })) });
    const service = new TaskService(repo);
    await expect(service.update(actor, baseTask.id, { status: TaskStatus.TODO })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects inaccessible linked records", async () => {
    const repo = repository({ validateRelations: vi.fn(async () => ({ assignedUser: true, creator: true, client: false, property: true, deal: true, viewing: true })) });
    const service = new TaskService(repo);
    await expect(service.create(actor, { title: "Linked task", priority: "MEDIUM", status: TaskStatus.TODO, clientId: "55555555-5555-4555-8555-555555555555" })).rejects.toMatchObject({ statusCode: 400 });
  });
});
