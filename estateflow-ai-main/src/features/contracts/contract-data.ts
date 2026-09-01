export const CONTRACT_STATUSES = [
  "Draft",
  "Under Review",
  "Ready to Sign",
  "Signed",
  "Cancelled",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];
export type ContractType = "Sale" | "Rental";
export type ContractVersion = {
  id: string;
  version: number;
  changedFields: string[];
  summary: string;
  snapshot: ContractSnapshot;
  createdAt: string;
};
export type ContractSnapshot = {
  contractNumber: string;
  type: ContractType;
  clientName: string;
  clientPhone: string;
  ownerName: string;
  propertyTitle: string;
  propertyLocation: string;
  agreedValueMinor: number;
  currency: "USD" | "IQD";
  depositMinor: number;
  commissionMinor: number;
  startDate: string;
  endDate: string;
  terms: string;
  clauses: string[];
  notes: string;
  responsibleAgent: string;
};
export type Contract = ContractSnapshot & {
  id: string;
  dealId: string;
  clientId: string;
  propertyId: string;
  offerId: string;
  status: ContractStatus;
  versions: ContractVersion[];
  signedSnapshot?: ContractSnapshot;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
};
