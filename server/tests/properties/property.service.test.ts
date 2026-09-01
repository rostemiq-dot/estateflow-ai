import { describe, expect, it, vi } from "vitest";
import { DuplicateReferenceCodeError } from "../../src/modules/properties/repositories/property.repository.js";
import { PropertyService } from "../../src/modules/properties/services/property.service.js";
import {
  adminActor,
  agencyId,
  agentActor,
  agentId,
  createPropertyInput,
  createPropertyRepositoryMock,
  otherAgentId,
  ownerActor,
  ownerId,
  propertyFixture,
  propertyId,
} from "./property.fixtures.js";

const createService = () => {
  const repository = createPropertyRepositoryMock();
  const now = new Date("2026-07-28T12:00:00.000Z");
  const service = new PropertyService(repository, () => now);
  return { now, repository, service };
};

describe("PropertyService creation", () => {
  it("derives agency and creator IDs from the authenticated user", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.create).mockResolvedValue(propertyFixture);

    await service.create(ownerActor, createPropertyInput);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId,
        createdById: ownerId,
        assignedAgentId: null,
      }),
    );
  });

  it("allows the same reference code to be passed for separate agencies", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.create)
      .mockResolvedValueOnce(propertyFixture)
      .mockResolvedValueOnce({
        ...propertyFixture,
        id: "77777777-7777-4777-8777-777777777777",
        agencyId: "99999999-9999-4999-8999-999999999999",
      });

    await service.create(ownerActor, createPropertyInput);
    await service.create(
      {
        ...ownerActor,
        agencyId: "99999999-9999-4999-8999-999999999999",
      },
      createPropertyInput,
    );

    expect(repository.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ agencyId }),
    );
    expect(repository.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        agencyId: "99999999-9999-4999-8999-999999999999",
      }),
    );
  });

  it("maps duplicate agency reference codes to a safe 409", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.create).mockRejectedValue(
      new DuplicateReferenceCodeError(),
    );

    await expect(
      service.create(ownerActor, createPropertyInput),
    ).rejects.toMatchObject({
      message: "Property reference code already exists",
      statusCode: 409,
    });
  });

  it("rejects an assigned user outside the actor's agency", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.isActiveUserInAgency).mockResolvedValue(false);

    await expect(
      service.create(ownerActor, {
        ...createPropertyInput,
        assignedAgentId: otherAgentId,
      }),
    ).rejects.toMatchObject({
      message: "Assigned agent is unavailable",
      statusCode: 400,
    });
    expect(repository.isActiveUserInAgency).toHaveBeenCalledWith(
      otherAgentId,
      agencyId,
    );
  });

  it("allows an agent to assign only themselves", async () => {
    const { repository, service } = createService();

    await expect(
      service.create(agentActor, {
        ...createPropertyInput,
        assignedAgentId: otherAgentId,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.isActiveUserInAgency).not.toHaveBeenCalled();

    vi.mocked(repository.isActiveUserInAgency).mockResolvedValue(true);
    vi.mocked(repository.create).mockResolvedValue({
      ...propertyFixture,
      createdById: agentId,
      assignedAgentId: agentId,
    });
    await expect(
      service.create(agentActor, {
        ...createPropertyInput,
        assignedAgentId: agentId,
      }),
    ).resolves.toBeDefined();
  });
});

describe("PropertyService queries", () => {
  it("scopes listings and returns pagination metadata", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.list).mockResolvedValue({
      records: [propertyFixture],
      total: 41,
    });

    const result = await service.list(ownerActor, {
      page: 2,
      pageSize: 20,
      search: "villa",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId,
        page: 2,
        search: "villa",
      }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
    expect(result.data[0].price).toBe("350000.00");
  });

  it("returns the same 404 for missing and cross-agency property IDs", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(service.getById(ownerActor, propertyId)).rejects.toMatchObject(
      {
        message: "Property not found",
        statusCode: 404,
      },
    );
    expect(repository.findById).toHaveBeenCalledWith(agencyId, propertyId);
  });
});

describe("PropertyService updates", () => {
  it.each([
    ["OWNER", ownerActor],
    ["ADMIN", adminActor],
  ] as const)("allows %s to update a scoped property", async (_role, actor) => {
    const { repository, service } = createService();
    vi.mocked(repository.findById).mockResolvedValue(propertyFixture);
    vi.mocked(repository.update).mockResolvedValue({
      ...propertyFixture,
      title: "Updated title",
    });

    await expect(
      service.update(actor, propertyId, { title: "Updated title" }),
    ).resolves.toMatchObject({ title: "Updated title" });
    expect(repository.update).toHaveBeenCalledWith(
      agencyId,
      propertyId,
      expect.objectContaining({ title: "Updated title" }),
    );
  });

  it("allows an agent to update a property they created or are assigned", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.findById).mockResolvedValue({
      ...propertyFixture,
      createdById: agentId,
      assignedAgentId: null,
    });
    vi.mocked(repository.update).mockResolvedValue({
      ...propertyFixture,
      createdById: agentId,
      title: "Agent update",
    });

    await expect(
      service.update(agentActor, propertyId, { title: "Agent update" }),
    ).resolves.toBeDefined();
  });

  it("rejects an agent who neither created nor is assigned the property", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.findById).mockResolvedValue({
      ...propertyFixture,
      createdById: ownerId,
      assignedAgentId: otherAgentId,
    });

    await expect(
      service.update(agentActor, propertyId, { title: "Forbidden update" }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("prevents an agent from assigning another user", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.findById).mockResolvedValue({
      ...propertyFixture,
      assignedAgentId: agentId,
    });

    await expect(
      service.update(agentActor, propertyId, {
        assignedAgentId: otherAgentId,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("preserves cross-agency update isolation with a 404", async () => {
    const { repository, service } = createService();
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(
      service.update(ownerActor, propertyId, { title: "Hidden property" }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(repository.update).not.toHaveBeenCalled();
  });
});

describe("PropertyService soft deletion", () => {
  it.each([ownerActor, adminActor])(
    "allows privileged role $role to soft-delete",
    async (actor) => {
      const { now, repository, service } = createService();
      vi.mocked(repository.softDelete).mockResolvedValue(true);

      await service.remove(actor, propertyId);
      expect(repository.softDelete).toHaveBeenCalledWith(
        agencyId,
        propertyId,
        now,
      );
    },
  );

  it("rejects agents and returns 404 for a second delete", async () => {
    const { repository, service } = createService();

    await expect(service.remove(agentActor, propertyId)).rejects.toMatchObject({
      statusCode: 403,
    });

    vi.mocked(repository.softDelete).mockResolvedValue(false);
    await expect(service.remove(ownerActor, propertyId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
