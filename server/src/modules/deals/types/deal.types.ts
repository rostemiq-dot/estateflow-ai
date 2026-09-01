import type { Deal, Prisma } from "@prisma/client";
import type { ListDealsQuery } from "../validators/deal.validators.js";

export type DealRecord = Prisma.DealGetPayload<{
  include: { client: true; property: true };
}>;
export type DealResponse = Omit<
  Deal,
  | "askingPrice"
  | "offerAmount"
  | "agreedAmount"
  | "expectedCommission"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
> & {
  askingPrice: string | null;
  offerAmount: string | null;
  agreedAmount: string | null;
  expectedCommission: string | null;
  createdAt: string;
  updatedAt: string;
};
export type DealListOptions = ListDealsQuery & {
  agencyId: string;
  permittedAgentId?: string;
};
