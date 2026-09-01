import { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { ClientRepository } from "../../src/modules/clients/repositories/client.repository.js";
import { ClientService } from "../../src/modules/clients/services/client.service.js";
import {
  agencyId,
  agentActor,
  agentId,
  clientFixture,
  clientId,
  createClientInput,
  otherAgentId,
  ownerActor,
} from "./client.fixtures.js";

const repositoryMock = (): ClientRepository =>
  ({
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    isActiveUserInAgency: vi.fn(),
    assignAgent: vi.fn(),
    listRoles: vi.fn(),
    addRole: vi.fn(),
    removeRole: vi.fn(),
    listPreferences: vi.fn(),
    createPreference: vi.fn(),
    updatePreference: vi.fn(),
    softDeletePreference: vi.fn(),
    listActivities: vi.fn(),
    createActivity: vi.fn(),
    listTags: vi.fn(),
    findTagById: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    softDeleteTag: vi.fn(),
    assignTag: vi.fn(),
    removeTag: vi.fn(),
  }) as ClientRepository;

describe("ClientService access and assignment", () => {
  it("forces agent-created clients to the authenticated agent", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.create).mockResolvedValue(clientFixture);
    await new ClientService(repository).create(agentActor, createClientInput);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId,
        assignedAgentId: agentId,
        fullName: "Sara Ahmed",
      }),
    );
  });

  it("rejects an agent assigning a client to another agent", async () => {
    const repository = repositoryMock();
    await expect(
      new ClientService(repository).create(agentActor, {
        ...createClientInput,
        assignedAgentId: otherAgentId,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("always applies agent-level list isolation and pagination", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.list).mockResolvedValue({
      records: [clientFixture],
      total: 21,
    });
    const result = await new ClientService(repository).list(agentActor, {
      page: 2,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId,
        permittedAgentId: agentId,
      }),
    );
    expect(result.pagination.totalPages).toBe(3);
  });

  it("returns a uniform 404 for unassigned or cross-agency clients", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      new ClientService(repository).get(agentActor, clientId),
    ).rejects.toMatchObject({ message: "Client not found", statusCode: 404 });
    expect(repository.findById).toHaveBeenCalledWith(
      agencyId,
      clientId,
      agentId,
    );
  });

  it("allows only managers to assign and validates agency membership", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.isActiveUserInAgency).mockResolvedValue(false);
    await expect(
      new ClientService(repository).assign(ownerActor, clientId, otherAgentId),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      new ClientService(repository).assign(
        { ...agentActor, role: UserRole.AGENT },
        clientId,
        agentId,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("soft deletes with agency scope and the injected clock", async () => {
    const repository = repositoryMock();
    const now = new Date("2026-07-28T18:00:00.000Z");
    vi.mocked(repository.softDelete).mockResolvedValue(true);
    await new ClientService(repository, () => now).remove(ownerActor, clientId);
    expect(repository.softDelete).toHaveBeenCalledWith(agencyId, clientId, now);
  });
});
