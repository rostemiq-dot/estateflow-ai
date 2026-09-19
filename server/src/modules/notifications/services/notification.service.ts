import { UserRole, type Notification } from "@prisma/client";
import { AppError } from "../../../errors/app-error.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";
import type { NotificationRepository } from "../repositories/notification.repository.js";
import type { CreateNotificationInput } from "../validators/notification.validators.js";

export interface NotificationServiceContract {
  list(actor: AuthenticatedUser): Promise<Notification[]>;
  create(actor: AuthenticatedUser, input: CreateNotificationInput): Promise<Notification>;
  markRead(actor: AuthenticatedUser, id?: string): Promise<number>;
  remove(actor: AuthenticatedUser, id: string): Promise<void>;
}

export class NotificationService implements NotificationServiceContract {
  constructor(private readonly repository: NotificationRepository) {}

  async list(actor: AuthenticatedUser) {
    return this.repository.list(actor.agencyId, actor.id, actor.role !== UserRole.AGENT);
  }

  async create(actor: AuthenticatedUser, input: CreateNotificationInput) {
    if (actor.role === UserRole.AGENT && input.recipientId !== actor.id) {
      throw new AppError("Agents may only create notifications for themselves", 403);
    }
    const relations = await this.repository.validateRelations(actor.agencyId, input);
    if (!relations.recipient || !relations.client || !relations.property || !relations.deal || !relations.viewing || !relations.task) {
      throw new AppError("One or more notification records are unavailable", 400);
    }
    return this.repository.create({
      agencyId: actor.agencyId,
      recipientId: input.recipientId,
      clientId: input.clientId ?? null,
      propertyId: input.propertyId ?? null,
      dealId: input.dealId ?? null,
      viewingId: input.viewingId ?? null,
      taskId: input.taskId ?? null,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
    });
  }

  async markRead(actor: AuthenticatedUser, id?: string) {
    if (id) {
      const found = await this.repository.findById(actor.agencyId, actor.id, id, false);
      if (!found) throw new AppError("Notification not found", 404);
    }
    return this.repository.markRead(actor.agencyId, actor.id, id);
  }

  async remove(actor: AuthenticatedUser, id: string) {
    const removed = await this.repository.softDelete(actor.agencyId, actor.id, id, actor.role !== UserRole.AGENT);
    if (!removed) throw new AppError("Notification not found", 404);
  }
}
