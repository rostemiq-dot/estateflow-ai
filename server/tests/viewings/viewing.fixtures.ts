import { UserRole, ViewingStatus, type Viewing } from "@prisma/client";
import type { AuthenticatedUser } from "../../src/modules/auth/types/auth.types.js";

export const agencyId = "22222222-2222-4222-8222-222222222222";
export const ownerId = "11111111-1111-4111-8111-111111111111";
export const agentId = "33333333-3333-4333-8333-333333333333";
export const otherAgentId = "44444444-4444-4444-8444-444444444444";
export const viewingId = "55555555-5555-4555-8555-555555555555";
export const clientId = "66666666-6666-4666-8666-666666666666";
export const propertyId = "77777777-7777-4777-8777-777777777777";
export const dealId = "88888888-8888-4888-8888-888888888888";

export const ownerActor: AuthenticatedUser = {
  id: ownerId,
  email: "owner@example.com",
  agencyId,
  role: UserRole.OWNER,
};
export const agentActor: AuthenticatedUser = {
  id: agentId,
  email: "agent@example.com",
  agencyId,
  role: UserRole.AGENT,
};
export const viewing: Viewing = {
  id: viewingId,
  agencyId,
  propertyId,
  clientId,
  dealId,
  assignedAgentId: agentId,
  title: "Villa tour",
  description: null,
  status: ViewingStatus.SCHEDULED,
  startAt: new Date("2026-08-01T10:00:00Z"),
  endAt: new Date("2026-08-01T11:00:00Z"),
  timezone: "Asia/Baghdad",
  location: "Baghdad",
  outcome: null,
  cancellationReason: null,
  feedback: null,
  createdById: ownerId,
  createdAt: new Date("2026-07-28T00:00:00Z"),
  updatedAt: new Date("2026-07-28T00:00:00Z"),
  deletedAt: null,
};
export const input = {
  propertyId,
  clientId,
  dealId,
  assignedAgentId: agentId,
  title: "Villa tour",
  startAt: "2026-08-01T10:00:00Z",
  endAt: "2026-08-01T11:00:00Z",
  timezone: "Asia/Baghdad",
  location: "Baghdad",
};
