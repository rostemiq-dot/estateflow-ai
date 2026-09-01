import type { PropertyCurrency } from "../properties/property-data";

export const DEAL_STAGES = [
  "Lead",
  "Viewing",
  "Negotiation",
  "Offer Made",
  "Contract",
  "Closed Won",
  "Closed Lost",
] as const;

export const DEAL_TYPES = ["Sale", "Rental"] as const;
export const OFFER_STATUSES = [
  "Draft",
  "Sent",
  "Countered",
  "Accepted",
  "Rejected",
  "Expired",
] as const;
export const PAYMENT_STATUSES = [
  "Pending",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Cancelled",
] as const;
export const PAYMENT_METHODS = [
  "Cash",
  "Bank transfer",
  "Card",
  "Cheque",
  "Other",
] as const;
export const COMMISSION_MODES = ["Percentage", "Fixed"] as const;

export type DealStage = (typeof DEAL_STAGES)[number];
export type DealType = (typeof DEAL_TYPES)[number];
export type OfferStatus = (typeof OFFER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type CommissionMode = (typeof COMMISSION_MODES)[number];

export type DealHistoryEntry = {
  id: string;
  type: "Created" | "Updated" | "Stage" | "Offer" | "Payment" | "Reopened";
  text: string;
  createdAt: string;
};

export type Offer = {
  id: string;
  parentOfferId?: string;
  amountMinor: number;
  date: string;
  expirationDate: string;
  conditions: string;
  notes: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
};

export type Commission = {
  mode: CommissionMode;
  rateBasisPoints: number;
  fixedAmountMinor: number;
  agentShareBasisPoints: number;
  confirmed: boolean;
};

export type PaymentRecord = {
  id: string;
  amountMinor: number;
  paidDate: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
  createdAt: string;
};

export type PaymentSchedule = {
  id: string;
  label: string;
  amountMinor: number;
  dueDate: string;
  status: PaymentStatus;
  records: PaymentRecord[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Deal = {
  id: string;
  title: string;
  clientId: string;
  propertyId: string;
  type: DealType;
  stage: DealStage;
  expectedValueMinor: number;
  currency: PropertyCurrency;
  probability: number;
  assignedAgent: string;
  nextAction: string;
  nextActionAt: string;
  expectedCloseDate: string;
  notes: string;
  lostReason: string;
  archived: boolean;
  offers: Offer[];
  commission: Commission;
  payments: PaymentSchedule[];
  history: DealHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type DealDraft = Pick<
  Deal,
  | "title"
  | "clientId"
  | "propertyId"
  | "type"
  | "stage"
  | "expectedValueMinor"
  | "currency"
  | "probability"
  | "assignedAgent"
  | "nextAction"
  | "nextActionAt"
  | "expectedCloseDate"
  | "notes"
>;
