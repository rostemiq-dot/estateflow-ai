import type {
  Client,
  ClientActivity,
  ClientPreference,
  ClientRole,
  ClientTag,
  Prisma,
} from "@prisma/client";
import type {
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
} from "../validators/client.validators.js";

export type ClientRecord = Prisma.ClientGetPayload<{
  include: {
    roles: true;
    tags: { include: { tag: true } };
  };
}>;
export type ClientDetailRecord = Prisma.ClientGetPayload<{
  include: {
    roles: true;
    tags: { include: { tag: true } };
    preferences: true;
  };
}>;
export type ClientWriteData = Omit<
  CreateClientInput,
  "assignedAgentId" | "nextFollowUpAt" | "lastContactAt"
> & {
  agencyId: string;
  assignedAgentId: string | null;
  fullName: string;
  nextFollowUpAt?: Date | null;
  lastContactAt?: Date | null;
};
export type ClientUpdateData = Omit<
  UpdateClientInput,
  "nextFollowUpAt" | "lastContactAt"
> & {
  fullName?: string;
  nextFollowUpAt?: Date | null;
  lastContactAt?: Date | null;
};
export type ClientListOptions = ListClientsQuery & {
  agencyId: string;
  permittedAgentId?: string;
};
export type ClientResponse = Omit<
  Client,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt: string;
  updatedAt: string;
  roles: ClientRole["role"][];
  tags: ClientTag[];
};
export type PreferenceResponse = Omit<
  ClientPreference,
  "minArea" | "maxArea" | "minBudget" | "maxBudget"
> & {
  minArea: string | null;
  maxArea: string | null;
  minBudget: string | null;
  maxBudget: string | null;
};
export type ActivityResponse = ClientActivity;
