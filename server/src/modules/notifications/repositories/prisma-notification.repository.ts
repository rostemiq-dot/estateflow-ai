import { prisma } from "../../../lib/prisma.js";
import type { NotificationRepository } from "./notification.repository.js";

type NotificationCreateData = Parameters<typeof prisma.notification.create>[0]["data"];

export class PrismaNotificationRepository implements NotificationRepository {
  list(agencyId: string, recipientId: string, includeAgency: boolean) {
    return prisma.notification.findMany({
      where: { agencyId, deletedAt: null, ...(includeAgency ? {} : { recipientId }) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  findById(agencyId: string, recipientId: string, id: string, includeAgency: boolean) {
    return prisma.notification.findFirst({
      where: { id, agencyId, deletedAt: null, ...(includeAgency ? {} : { recipientId }) },
    });
  }

  async validateRelations(agencyId: string, input: { recipientId: string; clientId?: string | null; propertyId?: string | null; dealId?: string | null; viewingId?: string | null; taskId?: string | null }) {
    const [recipient, client, property, deal, viewing, task] = await Promise.all([
      prisma.user.count({ where: { id: input.recipientId, agencyId, isActive: true } }),
      input.clientId ? prisma.client.count({ where: { id: input.clientId, agencyId, deletedAt: null } }) : Promise.resolve(1),
      input.propertyId ? prisma.property.count({ where: { id: input.propertyId, agencyId, deletedAt: null } }) : Promise.resolve(1),
      input.dealId ? prisma.deal.count({ where: { id: input.dealId, agencyId, deletedAt: null } }) : Promise.resolve(1),
      input.viewingId ? prisma.viewing.count({ where: { id: input.viewingId, agencyId, deletedAt: null } }) : Promise.resolve(1),
      input.taskId ? prisma.task.count({ where: { id: input.taskId, agencyId, deletedAt: null } }) : Promise.resolve(1),
    ]);
    return { recipient: recipient === 1, client: client === 1, property: property === 1, deal: deal === 1, viewing: viewing === 1, task: task === 1 };
  }

  create(data: NotificationCreateData) {
    return prisma.notification.create({ data });
  }

  async markRead(agencyId: string, recipientId: string, id?: string) {
    const result = await prisma.notification.updateMany({
      where: { agencyId, recipientId, deletedAt: null, readAt: null, ...(id ? { id } : {}) },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async softDelete(agencyId: string, recipientId: string, id: string, includeAgency: boolean) {
    const result = await prisma.notification.updateMany({
      where: { id, agencyId, deletedAt: null, ...(includeAgency ? {} : { recipientId }) },
      data: { deletedAt: new Date() },
    });
    return result.count === 1;
  }
}
