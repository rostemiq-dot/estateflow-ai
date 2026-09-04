import { apiFetch } from "../../lib/api";
import type { Deal, DealStage, DealType } from "./deal-data";

export type BackendDeal = {
  id: string;
  agencyId: string;
  createdById: string;
  assignedAgentId: string;
  clientId: string;
  propertyId: string;
  title: string;
  dealType: "SALE" | "RENTAL" | "LEASE" | "DEVELOPMENT" | "INVESTMENT" | "OTHER";
  stage:
    | "NEW_LEAD"
    | "QUALIFIED"
    | "PROPERTY_MATCHED"
    | "VIEWING_SCHEDULED"
    | "OFFER_SUBMITTED"
    | "NEGOTIATION"
    | "CONTRACT"
    | "WON"
    | "LOST";
  status: "OPEN" | "WON" | "LOST" | "CANCELLED";
  askingPrice: string | null;
  offerAmount: string | null;
  agreedAmount: string | null;
  currency: "USD" | "IQD";
  expectedCommission: string | null;
  commissionType: "FIXED" | "PERCENTAGE" | null;
  expectedCloseAt: string | null;
  closedAt: string | null;
  lostReason: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; fullName: string; phone: string; email: string | null };
  property: { id: string; title: string; referenceCode: string; price: string; currency: "USD" | "IQD"; city: string };
};

type ListResponse = {
  data: BackendDeal[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
type WriteResponse = { data: BackendDeal };

const stageToBackend: Record<DealStage, BackendDeal["stage"]> = {
  Lead: "NEW_LEAD",
  Viewing: "VIEWING_SCHEDULED",
  Negotiation: "NEGOTIATION",
  "Offer Made": "OFFER_SUBMITTED",
  Contract: "CONTRACT",
  "Closed Won": "WON",
  "Closed Lost": "LOST",
};
const stageFromBackend: Record<BackendDeal["stage"], DealStage> = {
  NEW_LEAD: "Lead",
  QUALIFIED: "Lead",
  PROPERTY_MATCHED: "Viewing",
  VIEWING_SCHEDULED: "Viewing",
  OFFER_SUBMITTED: "Offer Made",
  NEGOTIATION: "Negotiation",
  CONTRACT: "Contract",
  WON: "Closed Won",
  LOST: "Closed Lost",
};

function amountMinor(value: string | null) {
  if (!value) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function toType(value: BackendDeal["dealType"]): DealType {
  return value === "RENTAL" ? "Rental" : "Sale";
}

function fromBackend(deal: BackendDeal): Deal {
  const expectedValue = deal.agreedAmount ?? deal.offerAmount ?? deal.askingPrice ?? "0";
  return {
    id: deal.id,
    title: deal.title,
    clientId: deal.clientId,
    propertyId: deal.propertyId,
    type: toType(deal.dealType),
    stage: stageFromBackend[deal.stage],
    expectedValueMinor: amountMinor(expectedValue),
    currency: deal.currency,
    probability: deal.status === "WON" ? 100 : deal.status === "LOST" ? 0 : 50,
    assignedAgent: deal.assignedAgentId,
    nextAction: "",
    nextActionAt: "",
    expectedCloseDate: deal.expectedCloseAt ? deal.expectedCloseAt.slice(0, 10) : "",
    notes: deal.description ?? "",
    lostReason: deal.lostReason ?? "",
    archived: false,
    offers: [],
    commission: {
      mode: deal.commissionType === "FIXED" ? "Fixed" : "Percentage",
      rateBasisPoints: deal.commissionType === "PERCENTAGE" ? Math.round(Number(deal.expectedCommission ?? 0) * 100) : 0,
      fixedAmountMinor: deal.commissionType === "FIXED" ? amountMinor(deal.expectedCommission) : 0,
      agentShareBasisPoints: 5000,
      confirmed: false,
    },
    payments: [],
    history: [],
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
}

export async function listDealsFromDatabase(params: {
  search?: string;
  stage?: DealStage;
  dealType?: DealType;
  pageSize?: number;
} = {}) {
  const query = new URLSearchParams({
    page: "1",
    pageSize: String(params.pageSize ?? 100),
    sortBy: "updatedAt",
    sortOrder: "desc",
  });
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.stage) query.set("stage", stageToBackend[params.stage]);
  if (params.dealType) query.set("dealType", params.dealType === "Rental" ? "RENTAL" : "SALE");
  const response = await apiFetch<ListResponse>(`/api/deals?${query.toString()}`);
  return response.data.map(fromBackend);
}

export async function createDealInDatabase(input: {
  title: string;
  clientId: string;
  propertyId: string;
  assignedAgentId: string;
  type: DealType;
  stage: DealStage;
  value: number;
  currency: "USD" | "IQD";
  expectedCloseDate?: string;
  notes?: string;
}) {
  const response = await apiFetch<WriteResponse>("/api/deals", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      clientId: input.clientId,
      propertyId: input.propertyId,
      assignedAgentId: input.assignedAgentId,
      dealType: input.type === "Rental" ? "RENTAL" : "SALE",
      stage: stageToBackend[input.stage],
      status: input.stage === "Closed Won" ? "WON" : input.stage === "Closed Lost" ? "LOST" : "OPEN",
      askingPrice: String(input.value),
      offerAmount: null,
      agreedAmount: null,
      currency: input.currency,
      expectedCommission: null,
      commissionType: null,
      expectedCloseAt: input.expectedCloseDate ? new Date(`${input.expectedCloseDate}T00:00:00.000Z`).toISOString() : null,
      closedAt: input.stage === "Closed Won" || input.stage === "Closed Lost" ? new Date().toISOString() : null,
      lostReason: input.stage === "Closed Lost" ? input.notes?.trim() || "Not specified" : null,
      description: input.notes?.trim() || null,
    }),
  });
  return fromBackend(response.data);
}

export async function updateDealInDatabase(deal: Deal) {
  const response = await apiFetch<WriteResponse>(`/api/deals/${deal.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: deal.title,
      dealType: deal.type === "Rental" ? "RENTAL" : "SALE",
      askingPrice: String(deal.expectedValueMinor / 100),
      offerAmount: null,
      agreedAmount: null,
      currency: deal.currency,
      expectedCommission: null,
      commissionType: null,
      expectedCloseAt: deal.expectedCloseDate ? new Date(`${deal.expectedCloseDate}T00:00:00.000Z`).toISOString() : null,
      description: deal.notes || null,
      status: deal.stage === "Closed Won" ? "WON" : deal.stage === "Closed Lost" ? "LOST" : "OPEN",
    }),
  });
  return fromBackend(response.data);
}

export async function changeDealStageInDatabase(deal: Deal, stage: DealStage, lostReason?: string) {
  const response = await apiFetch<WriteResponse>(`/api/deals/${deal.id}/stage`, {
    method: "PATCH",
    body: JSON.stringify({
      stage: stageToBackend[stage],
      closedAt: stage === "Closed Won" || stage === "Closed Lost" ? new Date().toISOString() : null,
      lostReason: stage === "Closed Lost" ? lostReason?.trim() || null : null,
      note: `Stage changed from ${deal.stage} to ${stage}.`,
    }),
  });
  return fromBackend(response.data);
}

export async function deleteDealFromDatabase(dealId: string) {
  await apiFetch<void>(`/api/deals/${dealId}`, { method: "DELETE" });
}
