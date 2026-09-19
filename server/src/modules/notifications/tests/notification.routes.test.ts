import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { createNotificationRouter } from "../routes/notification.routes.js";
import type { NotificationServiceContract } from "../services/notification.service.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";

const actor: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "agent@example.com",
  agencyId: "22222222-2222-4222-8222-222222222222",
  role: UserRole.AGENT,
};

const service: NotificationServiceContract = {
  list: vi.fn(async () => []),
  create: vi.fn(),
  markRead: vi.fn(async () => 1),
  remove: vi.fn(async () => undefined),
};
const authenticate: RequestHandler = (req, _res, next) => { req.user = actor; next(); };
const app = express();
app.use(express.json());
app.use("/api/notifications", createNotificationRouter(service, authenticate));

describe("Notification routes", () => {
  it("lists notifications for the authenticated user", async () => {
    const response = await request(app).get("/api/notifications");
    expect(response.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(actor);
  });

  it("validates notification creation", async () => {
    const response = await request(app).post("/api/notifications").send({ recipientId: "not-a-uuid", title: "" });
    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("marks a notification as read", async () => {
    const id = "33333333-3333-4333-8333-333333333333";
    const response = await request(app).patch(`/api/notifications/${id}/read`);
    expect(response.status).toBe(200);
    expect(service.markRead).toHaveBeenCalledWith(actor, id);
  });
});
