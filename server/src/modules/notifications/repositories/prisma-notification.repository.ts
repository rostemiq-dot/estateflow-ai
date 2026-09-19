import { prisma } from "../../../lib/prisma.js";
import type { NotificationRepository } from "./notification.repository.js";

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

  create(data: Prisma.NotificationUncheckedCreateInput) {
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
