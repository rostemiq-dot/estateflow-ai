import { describe, expect, it, vi } from "vitest";
import { NotificationType, UserRole } from "@prisma/client";
import { NotificationService } from "../services/notification.service.js";
import type { NotificationRepository } from "../repositories/notification.repository.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";

const actor: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "agent@example.com",
  agencyId: "22222222-2222-4222-8222-222222222222",
  role: UserRole.AGENT,
};

const notification = {
  id: "33333333-3333-4333-8333-333333333333",
  agencyId: actor.agencyId,
  recipientId: actor.id,
  clientId: null,
  propertyId: null,
  dealId: null,
  viewingId: null,
  taskId: null,
  type: NotificationType.TASK,
  title: "Task due",
  message: "Call the client",
  readAt: null,
  createdAt: new Date(),
  deletedAt: null,
};

function repository(overrides: Partial<NotificationRepository> = {}): NotificationRepository {
  return {
    list: vi.fn(async () => [notification]),
    findById: vi.fn(async () => notification),
    create: vi.fn(async (data) => ({ ...notification, ...data })),
    markRead: vi.fn(async () => 1),
    softDelete: vi.fn(async () => true),
    ...overrides,
  };
}

describe("NotificationService", () => {
  it("returns notifications for the authenticated agent only", async () => {
    const repo = repository();
    const service = new NotificationService(repo);
    await service.list(actor);
    expect(repo.list).toHaveBeenCalledWith(actor.agencyId, actor.id, false);
  });

  it("rejects agents creating notifications for another user", async () => {
    const service = new NotificationService(repository());
    await expect(service.create(actor, {
      recipientId: "44444444-4444-4444-8444-444444444444",
      title: "No",
      type: NotificationType.GENERAL,
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("marks only the authenticated user's notification as read", async () => {
    const repo = repository();
    const service = new NotificationService(repo);
    await service.markRead(actor, notification.id);
    expect(repo.markRead).toHaveBeenCalledWith(actor.agencyId, actor.id, notification.id);
  });

  it("does not expose another agency notification", async () => {
    const repo = repository({ findById: vi.fn(async () => null) });
    const service = new NotificationService(repo);
    await expect(service.markRead(actor, notification.id)).rejects.toMatchObject({ statusCode: 404 });
  });
});
