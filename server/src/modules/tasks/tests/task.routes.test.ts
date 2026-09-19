import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { createTaskRouter } from "../routes/task.routes.js";
import type { TaskServiceContract } from "../services/task.service.js";
import type { AuthenticatedUser } from "../../auth/types/auth.types.js";

const actor: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "agent@example.com",
  agencyId: "22222222-2222-4222-8222-222222222222",
  role: UserRole.AGENT,
};

const service: TaskServiceContract = {
  create: vi.fn(async (_actor, input) => ({ id: "33333333-3333-4333-8333-333333333333", agencyId: actor.agencyId, assignedUserId: actor.id, createdById: actor.id, clientId: null, propertyId: null, dealId: null, viewingId: null, title: input.title, description: null, status: input.status, priority: input.priority, dueAt: null, completedAt: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null })),
  list: vi.fn(async () => ({ data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })),
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

const authenticate: RequestHandler = (req, _res, next) => {
  req.user = actor;
  next();
};

const app = express();
app.use(express.json());
app.use("/api/tasks", createTaskRouter(service, authenticate));

describe("Task routes", () => {
  it("requires valid task input", async () => {
    const response = await request(app).post("/api/tasks").send({ title: "" });
    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("passes authenticated task creation to the service", async () => {
    const response = await request(app).post("/api/tasks").send({ title: "Follow up", priority: "HIGH" });
    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(actor, expect.objectContaining({ title: "Follow up", priority: "HIGH", status: "TODO" }));
  });

  it("returns the service list", async () => {
    const response = await request(app).get("/api/tasks?status=TODO");
    expect(response.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(actor, expect.objectContaining({ status: "TODO" }));
  });
});
