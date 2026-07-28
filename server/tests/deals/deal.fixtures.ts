import {
  CommissionType,
  Currency,
  DealStage,
  DealStatus,
  DealType,
  Prisma,
  UserRole,
  type Deal,
} from "@prisma/client";
import type { AuthenticatedUser } from "../../src/modules/auth/types/auth.types.js";
export const agencyId = "22222222-2222-4222-8222-222222222222",
  ownerId = "11111111-1111-4111-8111-111111111111";
export const agentId = "33333333-3333-4333-8333-333333333333",
  otherAgentId = "44444444-4444-4444-8444-444444444444";
export const dealId = "55555555-5555-4555-8555-555555555555",
  clientId = "66666666-6666-4666-8666-666666666666";
export const propertyId = "77777777-7777-4777-8777-777777777777",
  noteId = "88888888-8888-4888-8888-888888888888";
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
export const deal: Deal = {
  id: dealId,
  agencyId,
  clientId,
  propertyId,
  assignedAgentId: agentId,
  title: "Villa sale",
  dealType: DealType.SALE,
  stage: DealStage.NEW_LEAD,
  status: DealStatus.OPEN,
  askingPrice: new Prisma.Decimal("350000"),
  offerAmount: null,
  agreedAmount: null,
  currency: Currency.USD,
  expectedCommission: new Prisma.Decimal("2.5"),
  commissionType: CommissionType.PERCENTAGE,
  expectedCloseAt: null,
  closedAt: null,
  lostReason: null,
  description: null,
  createdById: ownerId,
  createdAt: new Date("2026-07-28T00:00:00Z"),
  updatedAt: new Date("2026-07-28T00:00:00Z"),
  deletedAt: null,
};
export const input = {
  clientId,
  propertyId,
  assignedAgentId: agentId,
  title: "Villa sale",
  dealType: DealType.SALE,
  currency: Currency.USD,
  askingPrice: "350000",
  expectedCommission: "2.5",
  commissionType: CommissionType.PERCENTAGE,
};
