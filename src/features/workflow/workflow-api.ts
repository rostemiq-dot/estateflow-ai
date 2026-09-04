import { apiFetch } from "../../lib/api";

export type WorkflowOffer = {
  id: string; dealId: string; parentOfferId?: string | null; amount: string; currency: "USD" | "IQD";
  offerDate: string; expirationDate?: string | null; conditions: string; notes: string; status: string; createdAt?: string; updatedAt?: string;
};
export type WorkflowContract = {
  id: string; dealId: string; offerId: string; contractNumber: string; contractType: "SALE" | "RENTAL"; status: string;
  agreedAmount: string; currency: "USD" | "IQD"; startDate: string; endDate?: string | null; terms: string; clauses: string[]; notes: string;
  responsibleAgentId: string; signedAt?: string | null; createdAt?: string; updatedAt?: string;
};
export type WorkflowCommission = {
  id: string; dealId: string; contractId?: string | null; mode: "PERCENTAGE" | "FIXED"; rate: string; fixedAmount: string;
  agentShareRate: string; calculatedAmount: string; confirmed: boolean;
};
export type WorkflowPayment = {
  id: string; dealId: string; contractId?: string | null; label: string; amount: string; currency: "USD" | "IQD"; dueDate: string;
  status: string; notes: string; payments: Array<{ id: string; amount: string; paidDate: string; method: string; reference: string; notes: string }>;
};
const data = <T,>(response: { data: T }) => response.data;
export const listWorkflowOffers = (dealId?: string) => apiFetch<{ data: WorkflowOffer[] }>(`/api/workflow/offers${dealId ? `?dealId=${encodeURIComponent(dealId)}` : ""}`).then(data);
export const createWorkflowOffer = (input: { dealId: string; amount: number; currency: "USD" | "IQD"; expirationDate?: string; conditions?: string; notes?: string }) => apiFetch<{ data: WorkflowOffer }>("/api/workflow/offers", { method: "POST", body: JSON.stringify(input) }).then(data);
export const updateWorkflowOffer = (id: string, input: { amount?: number; expirationDate?: string; conditions?: string; notes?: string; status?: string }) => apiFetch<{ data: WorkflowOffer }>(`/api/workflow/offers/${id}`, { method: "PATCH", body: JSON.stringify(input) }).then(data);
export const deleteWorkflowOffer = (id: string) => apiFetch<void>(`/api/workflow/offers/${id}`, { method: "DELETE" });
export const listWorkflowContracts = () => apiFetch<{ data: WorkflowContract[] }>("/api/workflow/contracts").then(data);
export const createWorkflowContract = (input: { dealId: string; offerId: string; clientId: string; propertyId: string; contractNumber: string; contractType: "SALE" | "RENTAL"; currency: "USD" | "IQD"; startDate: string; endDate?: string; depositAmount?: number; commissionAmount?: number; terms?: string; clauses?: string[]; notes?: string; responsibleAgentId: string }) => apiFetch<{ data: WorkflowContract }>("/api/workflow/contracts", { method: "POST", body: JSON.stringify(input) }).then(data);
export const setWorkflowContractStatus = (id: string, status: "DRAFT" | "UNDER_REVIEW" | "READY_TO_SIGN" | "SIGNED" | "CANCELLED") => apiFetch<{ data: WorkflowContract }>(`/api/workflow/contracts/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }).then(data);
export const listWorkflowCommissions = () => apiFetch<{ data: WorkflowCommission[] }>("/api/workflow/commissions").then(data);
export const saveWorkflowCommission = (dealId: string, input: { mode: "PERCENTAGE" | "FIXED"; rate?: number; fixedAmount?: number; agentShareRate?: number }) => apiFetch<{ data: WorkflowCommission }>(`/api/workflow/commissions/${dealId}`, { method: "PUT", body: JSON.stringify(input) }).then(data);
export const listWorkflowPayments = () => apiFetch<{ data: WorkflowPayment[] }>("/api/workflow/payments").then(data);
export const createWorkflowPaymentSchedule = (input: { dealId: string; contractId?: string; label: string; amount: number; currency: "USD" | "IQD"; dueDate: string; notes?: string }) => apiFetch<{ data: WorkflowPayment }>("/api/workflow/payments/schedules", { method: "POST", body: JSON.stringify(input) }).then(data);
export const recordWorkflowPayment = (scheduleId: string, input: { amount: number; paidDate?: string; method: "CASH" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "OTHER"; reference?: string; notes?: string }) => apiFetch<{ data: unknown }>(`/api/workflow/payments/${scheduleId}/records`, { method: "POST", body: JSON.stringify(input) }).then(data);
