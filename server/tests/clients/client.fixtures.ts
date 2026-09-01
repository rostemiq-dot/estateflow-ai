import {
  ClientLeadSource,
  ClientLeadStatus,
  ClientPriority,
  ClientRoleType,
  UserRole,
  type Client,
} from "@prisma/client";
import type { AuthenticatedUser } from "../../src/modules/auth/types/auth.types.js";
import type { ClientRecord } from "../../src/modules/clients/types/client.types.js";

export const agencyId = "22222222-2222-4222-8222-222222222222";
export const ownerId = "11111111-1111-4111-8111-111111111111";
export const agentId = "33333333-3333-4333-8333-333333333333";
export const otherAgentId = "44444444-4444-4444-8444-444444444444";
export const clientId = "55555555-5555-4555-8555-555555555555";
export const preferenceId = "66666666-6666-4666-8666-666666666666";
export const tagId = "77777777-7777-4777-8777-777777777777";

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
const client: Client = {
  id: clientId,
  agencyId,
  assignedAgentId: agentId,
  firstName: "Sara",
  lastName: "Ahmed",
  fullName: "Sara Ahmed",
  email: "sara@example.com",
  phone: "+9647501234567",
  secondaryPhone: null,
  whatsapp: "+9647501234567",
  nationality: "Iraqi",
  preferredLanguage: "Kurdish",
  company: null,
  leadStatus: ClientLeadStatus.QUALIFIED,
  leadSource: ClientLeadSource.REFERRAL,
  priority: ClientPriority.HIGH,
  rating: 5,
  notes: null,
  nextFollowUpAt: null,
  lastContactAt: null,
  createdAt: new Date("2026-07-28T12:00:00.000Z"),
  updatedAt: new Date("2026-07-28T12:00:00.000Z"),
  deletedAt: null,
};
export const clientFixture: ClientRecord = {
  ...client,
  roles: [
    {
      clientId,
      role: ClientRoleType.BUYER,
      createdAt: client.createdAt,
    },
  ],
  tags: [],
};
export const createClientInput = {
  firstName: "Sara",
  lastName: "Ahmed",
  email: "sara@example.com",
  phone: "+9647501234567",
  whatsapp: "+9647501234567",
  leadStatus: ClientLeadStatus.QUALIFIED,
  leadSource: ClientLeadSource.REFERRAL,
  priority: ClientPriority.HIGH,
  rating: 5,
};
