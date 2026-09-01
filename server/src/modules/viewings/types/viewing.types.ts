import type { Prisma, Viewing } from "@prisma/client";
import type { ListViewingsQuery } from "../validators/viewing.validators.js";
export type ViewingRecord = Prisma.ViewingGetPayload<{
  include: { client: true; property: true; deal: true };
}>;
export type ViewingResponse = Omit<
  Viewing,
  "createdAt" | "updatedAt" | "deletedAt"
> & { createdAt: string; updatedAt: string };
export type ViewingListOptions = ListViewingsQuery & {
  agencyId: string;
  permittedAgentId?: string;
};
