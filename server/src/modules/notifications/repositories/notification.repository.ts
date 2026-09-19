import type { Notification } from "@prisma/client";
import { Prisma } from "@prisma/client";

export interface NotificationRepository {
  list(agencyId: string, recipientId: string, includeAgency: boolean): Promise<Notification[]>;
  findById(agencyId: string, recipientId: string, id: string, includeAgency: boolean): Promise<Notification | null>;
  create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification>;
  markRead(agencyId: string, recipientId: string, id?: string): Promise<number>;
  softDelete(agencyId: string, recipientId: string, id: string, includeAgency: boolean): Promise<boolean>;
}
