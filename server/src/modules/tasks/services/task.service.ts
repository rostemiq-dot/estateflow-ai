import { TaskStatus, UserRole, type Task, Prisma } from "@prisma/client";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import type { TaskRepository } from "../repositories/task.repository.js";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "../validators/task.validators.js";

export interface TaskServiceContract {
  create(actor: AuthenticatedUser, input: CreateTaskInput): Promise<Task>;
  list(actor: AuthenticatedUser, query: ListTasksQuery): Promise<{ data: Task[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>;
  get(actor: AuthenticatedUser, id: string): Promise<Task>;
  update(actor: AuthenticatedUser, id: string, input: UpdateTaskInput): Promise<Task>;
  remove(actor: AuthenticatedUser, id: string): Promise<void>;
}

const permittedUser = (actor: AuthenticatedUser) => actor.role === UserRole.AGENT ? actor.id : undefined;
const isManager = (actor: AuthenticatedUser) => actor.role !== UserRole.AGENT;
const notFound = () => new AppError("Task not found", 404);

export class TaskService implements TaskServiceContract {
  constructor(private readonly repository: TaskRepository) {}

  async create(actor: AuthenticatedUser, input: CreateTaskInput) {
    const assignedUserId = input.assignedUserId ?? actor.id;
    if (!isManager(actor) && assignedUserId !== actor.id) {
      throw new AppError("Agents may only assign tasks to themselves", 403);
    }

    const relations = await this.repository.validateRelations(actor.agencyId, {
      assignedUserId,
      createdById: actor.id,
      clientId: input.clientId ?? null,
      propertyId: input.propertyId ?? null,
      dealId: input.dealId ?? null,
      viewingId: input.viewingId ?? null,
    });
    if (!relations.assignedUser || !relations.creator || !relations.client || !relations.property || !relations.deal || !relations.viewing) {
      throw new AppError("One or more linked records are unavailable", 400);
    }

    const now = new Date();
    return this.repository.create({
      agencyId: actor.agencyId,
      assignedUserId,
      createdById: actor.id,
      clientId: input.clientId ?? null,
      propertyId: input.propertyId ?? null,
      dealId: input.dealId ?? null,
      viewingId: input.viewingId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      completedAt: input.status === TaskStatus.COMPLETED ? now : null,
    });
  }

  async list(actor: AuthenticatedUser, query: ListTasksQuery) {
    if (actor.role === UserRole.AGENT && query.assignedUserId && query.assignedUserId !== actor.id) {
      throw new AppError("Insufficient permissions", 403);
    }
    const result = await this.repository.list({
      ...query,
      agencyId: actor.agencyId,
      ...(actor.role === UserRole.AGENT ? { assignedUserId: actor.id } : {}),
    });
    return {
      data: result.records,
      pagination: { page: query.page, pageSize: query.pageSize, total: result.total, totalPages: Math.ceil(result.total / query.pageSize) },
    };
  }

  async get(actor: AuthenticatedUser, id: string) {
    const task = await this.repository.findById(actor.agencyId, id, permittedUser(actor));
    if (!task) throw notFound();
    return task;
  }

  async update(actor: AuthenticatedUser, id: string, input: UpdateTaskInput) {
    const current = await this.get(actor, id);
    if (input.assignedUserId !== undefined && !isManager(actor)) {
      throw new AppError("Only managers may reassign tasks", 403);
    }
    if ((current.status === TaskStatus.COMPLETED || current.status === TaskStatus.CANCELLED) && input.status !== undefined && input.status !== current.status) {
      throw new AppError("Completed or cancelled tasks are terminal and cannot be reopened", 409);
    }

    const assignedUserId = input.assignedUserId ?? current.assignedUserId;
    const merged = {
      assignedUserId,
      createdById: current.createdById,
      clientId: input.clientId === undefined ? current.clientId : input.clientId,
      propertyId: input.propertyId === undefined ? current.propertyId : input.propertyId,
      dealId: input.dealId === undefined ? current.dealId : input.dealId,
      viewingId: input.viewingId === undefined ? current.viewingId : input.viewingId,
    };
    const relations = await this.repository.validateRelations(actor.agencyId, merged);
    if (!relations.assignedUser || !relations.creator || !relations.client || !relations.property || !relations.deal || !relations.viewing) {
      throw new AppError("One or more linked records are unavailable", 400);
    }

    const status = input.status ?? current.status;
    const data: Prisma.TaskUpdateManyMutationInput = {
      ...(input.assignedUserId !== undefined ? { assignedUserId } : {}),
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      ...(input.propertyId !== undefined ? { propertyId: input.propertyId } : {}),
      ...(input.dealId !== undefined ? { dealId: input.dealId } : {}),
      ...(input.viewingId !== undefined ? { viewingId: input.viewingId } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt) : null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(status === TaskStatus.COMPLETED ? { completedAt: current.completedAt ?? new Date() } : current.status === TaskStatus.COMPLETED ? { completedAt: null } : {}),
    };

    const updated = await this.repository.update(actor.agencyId, id, data, permittedUser(actor));
    if (!updated) throw notFound();
    return updated;
  }

  async remove(actor: AuthenticatedUser, id: string) {
    if (!isManager(actor)) throw new AppError("Only managers may delete tasks", 403);
    if (!(await this.repository.softDelete(actor.agencyId, id))) throw notFound();
  }
}
