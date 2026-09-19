import { NotificationType } from "@prisma/client";
import { z } from "zod";

export const notificationParamsSchema = z.object({ notificationId: z.uuid() }).strict();

export const createNotificationSchema = z.object({
  recipientId: z.uuid(),
  clientId: z.uuid().nullable().optional(),
  propertyId: z.uuid().nullable().optional(),
  dealId: z.uuid().nullable().optional(),
  viewingId: z.uuid().nullable().optional(),
  taskId: z.uuid().nullable().optional(),
  type: z.enum(NotificationType).default(NotificationType.GENERAL),
  title: z.string().trim().min(2).max(180),
  message: z.string().trim().max(20000).nullable().optional(),
}).strict();

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
