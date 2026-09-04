import type { Client } from "../clients/client-data";
import type { Property } from "../properties/property-data";
import {
  COMMISSION_MODES,
  DEAL_STAGES,
  DEAL_TYPES,
  OFFER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type Commission,
  type Deal,
  type DealDraft,
  type DealHistoryEntry,
  type DealStage,
  type DealType,
  type Offer,
  type OfferStatus,
  type PaymentMethod,
  type PaymentRecord,
  type PaymentSchedule,
  type PaymentStatus,
} from "./deal-data";
import { toMinorUnits } from "./deal-utils";

export const DEAL_STORAGE_KEY = "estateflow-deals";

type SaveResult = { ok: true } | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : fallback;
}

function enumValue<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
) {
  return typeof value === "string" && options.includes(value as T)
    ? (value as T)
    : fallback;
}

function dateValue(value: unknown, fallback: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : fallback;
}

function normalizeHistory(value: unknown): DealHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = stringValue(entry.id);
    const text = stringValue(entry.text).trim();
    const createdAt = dateValue(entry.createdAt, "");
    const validTypes = [
      "Created",
      "Updated",
      "Stage",
      "Offer",
      "Payment",
      "Reopened",
    ] as const;
    const type = enumValue(entry.type, validTypes, "Updated");
    return id && text && createdAt ? [{ id, type, text, createdAt }] : [];
  });
}

function normalizeOffer(value: unknown): Offer | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id);
  if (!id) return null;
  const now = new Date().toISOString();
  return {
    id,
    parentOfferId: stringValue(value.parentOfferId) || undefined,
    amountMinor: numberValue(value.amountMinor),
    date: stringValue(value.date),
    expirationDate: stringValue(value.expirationDate),
    conditions: stringValue(value.conditions),
    notes: stringValue(value.notes),
    status: enumValue<OfferStatus>(value.status, OFFER_STATUSES, "Draft"),
    createdAt: dateValue(value.createdAt, now),
    updatedAt: dateValue(value.updatedAt, now),
  };
}

function normalizeRecord(value: unknown): PaymentRecord | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id);
  if (!id) return null;
  const now = new Date().toISOString();
  return {
    id,
    amountMinor: numberValue(value.amountMinor),
    paidDate: stringValue(value.paidDate),
    method: enumValue<PaymentMethod>(
      value.method,
      PAYMENT_METHODS,
      "Bank transfer",
    ),
    reference: stringValue(value.reference),
    notes: stringValue(value.notes),
    createdAt: dateValue(value.createdAt, now),
  };
}

function normalizePayment(value: unknown): PaymentSchedule | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id);
  if (!id) return null;
  const now = new Date().toISOString();
  return {
    id,
    label: stringValue(value.label, "Payment"),
    amountMinor: numberValue(value.amountMinor),
    dueDate: stringValue(value.dueDate),
    status: enumValue<PaymentStatus>(value.status, PAYMENT_STATUSES, "Pending"),
    records: Array.isArray(value.records)
      ? value.records
          .map(normalizeRecord)
          .filter((record): record is PaymentRecord => record !== null)
      : [],
    notes: stringValue(value.notes),
    createdAt: dateValue(value.createdAt, now),
    updatedAt: dateValue(value.updatedAt, now),
  };
}

export function normalizeDeal(value: unknown): Deal | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id);
  const clientId = stringValue(value.clientId);
  const propertyId = stringValue(value.propertyId);
  if (!id || !clientId || !propertyId) return null;
  const now = new Date().toISOString();
  const rawCommission = isRecord(value.commission) ? value.commission : {};
  const commission: Commission = {
    mode: enumValue(rawCommission.mode, COMMISSION_MODES, "Percentage"),
    rateBasisPoints: numberValue(rawCommission.rateBasisPoints, 250),
    fixedAmountMinor: numberValue(rawCommission.fixedAmountMinor),
    agentShareBasisPoints: Math.min(
      10_000,
      numberValue(rawCommission.agentShareBasisPoints, 5_000),
    ),
    confirmed: rawCommission.confirmed === true,
  };
  return {
    id,
    title: stringValue(value.title, "Untitled deal"),
    clientId,
    propertyId,
    type: enumValue<DealType>(value.type, DEAL_TYPES, "Sale"),
    stage: enumValue<DealStage>(value.stage, DEAL_STAGES, "Lead"),
    expectedValueMinor: numberValue(value.expectedValueMinor),
    currency: value.currency === "IQD" ? "IQD" : "USD",
    probability: Math.min(100, numberValue(value.probability, 25)),
    assignedAgent: stringValue(value.assignedAgent, "Mohammed"),
    nextAction: stringValue(value.nextAction),
    nextActionAt: stringValue(value.nextActionAt),
    expectedCloseDate: stringValue(value.expectedCloseDate),
    notes: stringValue(value.notes),
    lostReason: stringValue(value.lostReason),
    archived: value.archived === true,
    offers: Array.isArray(value.offers)
      ? value.offers
          .map(normalizeOffer)
          .filter((offer): offer is Offer => offer !== null)
      : [],
    commission,
    payments: Array.isArray(value.payments)
      ? value.payments
          .map(normalizePayment)
          .filter((payment): payment is PaymentSchedule => payment !== null)
      : [],
    history: normalizeHistory(value.history),
    createdAt: dateValue(value.createdAt, now),
    updatedAt: dateValue(value.updatedAt, now),
  };
}

/**
 * Legacy compatibility only. New production flows must not call this to seed
 * browser data. It is retained for older callers/tests that explicitly pass
 * records and need a deterministic empty-safe result.
 */
export function createSeedDeals(
  clients: readonly Client[],
  properties: readonly Property[],
): Deal[] {
  void clients;
  void properties;
  return [];
}

export function loadDeals(
  clients: readonly Client[] = [],
  properties: readonly Property[] = [],
): Deal[] {
  void clients;
  void properties;
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(DEAL_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeDeal)
      .filter((deal): deal is Deal => deal !== null);
  } catch {
    return [];
  }
}

export function saveDeals(deals: readonly Deal[]): SaveResult {
  if (typeof window === "undefined") {
    return {
      ok: false,
      message: "Deal saving is only available in the browser.",
    };
  }
  try {
    window.localStorage.setItem(DEAL_STORAGE_KEY, JSON.stringify(deals));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "This deal change could not be saved. Please try again.",
    };
  }
}

export function createDeal(draft: DealDraft, existing: readonly Deal[]): Deal {
  const now = new Date().toISOString();
  const id = `DEAL-${String(Date.now() % 1_000_000).padStart(6, "0")}`;
  const uniqueId = existing.some((deal) => deal.id === id) ? `${id}-2` : id;
  return {
    ...draft,
    id: uniqueId,
    lostReason: "",
    archived: false,
    offers: [],
    commission: {
      mode: "Percentage",
      rateBasisPoints: draft.type === "Sale" ? 250 : 500,
      fixedAmountMinor: 0,
      agentShareBasisPoints: 5000,
      confirmed: false,
    },
    payments: [],
    history: [
      {
        id: `HIST-${Date.now()}`,
        type: "Created",
        text: `Deal created at ${draft.stage} stage.`,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
