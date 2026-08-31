import {
  ClientLeadSource,
  ClientLeadStatus,
  ClientPriority,
  ClientRoleType,
  type PrismaClient,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  buildClientWhere,
  PrismaClientRepository,
} from "../../src/modules/clients/repositories/prisma-client.repository.js";
import {
  agencyId,
  agentId,
  clientFixture,
  clientId,
  tagId,
} from "./client.fixtures.js";

describe("PrismaClientRepository isolation", () => {
  it("scopes client details to agency, soft-delete, and permitted agent", async () => {
    const client = { findFirst: vi.fn().mockResolvedValue(clientFixture) };
    const repository = new PrismaClientRepository({
      client,
    } as unknown as Pick<
      PrismaClient,
      | "client"
      | "user"
      | "clientRole"
      | "clientPreference"
      | "clientActivity"
      | "clientTag"
      | "clientTagAssignment"
    >);

    await repository.findById(agencyId, clientId, agentId);
    expect(client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: clientId,
          agencyId,
          deletedAt: null,
          assignedAgentId: agentId,
        },
      }),
    );
  });

  it("builds combined search and filter conditions without losing agency scope", () => {
    const where = buildClientWhere({
      agencyId,
      permittedAgentId: agentId,
      page: 1,
      pageSize: 20,
      search: "sara",
      phone: "750",
      role: ClientRoleType.BUYER,
      leadStatus: ClientLeadStatus.QUALIFIED,
      leadSource: ClientLeadSource.REFERRAL,
      tagId,
      priority: ClientPriority.HIGH,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(where).toMatchObject({
      agencyId,
      deletedAt: null,
      assignedAgentId: agentId,
      leadStatus: ClientLeadStatus.QUALIFIED,
      roles: { some: { role: ClientRoleType.BUYER } },
      tags: { some: { tagId } },
    });
    expect(where.AND).toHaveLength(2);
  });

  it("uses agency-scoped tag lookups before assignment", async () => {
    const client = { count: vi.fn().mockResolvedValue(1) };
    const clientTag = {
      findFirst: vi.fn().mockResolvedValue({
        id: tagId,
        agencyId,
        deletedAt: null,
      }),
    };
    const clientTagAssignment = { upsert: vi.fn().mockResolvedValue({}) };
    const repository = new PrismaClientRepository({
      client,
      clientTag,
      clientTagAssignment,
    } as unknown as Pick<
      PrismaClient,
      | "client"
      | "user"
      | "clientRole"
      | "clientPreference"
      | "clientActivity"
      | "clientTag"
      | "clientTagAssignment"
    >);
    await repository.assignTag(agencyId, clientId, tagId, agentId);
    expect(clientTag.findFirst).toHaveBeenCalledWith({
      where: { id: tagId, agencyId, deletedAt: null },
    });
  });
});
