import type { Notification } from "@prisma/client";
import { Prisma } from "@prisma/client";

export interface NotificationRepository {
  list(agencyId: string, recipientId: string, includeAgency: boolean): Promise<Notification[]>;
  findById(agencyId: string, recipientId: string, id: string, includeAgency: boolean): Promise<Notification | null>;
  create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification>;
  validateRelations(agencyId: string, input: { recipientId: string; clientId?: string | null; propertyId?: string | null; dealId?: string | null; viewingId?: string | null; taskId?: string | null }): Promise<{ recipient: boolean; client: boolean; property: boolean; deal: boolean; viewing: boolean; task: boolean }>;
  markRead(agencyId: string, recipientId: string, id?: string): Promise<number>;
  softDelete(agencyId: string, recipientId: string, id: string, includeAgency: boolean): Promise<boolean>;
}
