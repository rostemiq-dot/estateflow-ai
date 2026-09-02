import type {
  Client,
  ClientActivity,
  ClientPreference,
  ClientRole,
  ClientTag,
  Prisma,
} from "@prisma/client";
import type {
  ListClientsQuery,
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

// Keep repository write types aligned with the generated Prisma client.
// Request validation remains owned by the Zod schemas; the service converts
// validated ISO date strings into Date objects before reaching the repository.
export type ClientWriteData = Prisma.ClientUncheckedCreateInput;
export type ClientUpdateData = Prisma.ClientUncheckedUpdateManyInput;

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
