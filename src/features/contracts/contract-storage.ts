import type { Client } from "../clients/client-data";
import type { Deal } from "../deals/deal-data";
import {
  calculateCommission,
  getAcceptedOffer,
  getCommissionBase,
} from "../deals/deal-utils";
import type { Property } from "../properties/property-data";
import {
  CONTRACT_STATUSES,
  type Contract,
  type ContractSnapshot,
  type ContractStatus,
} from "./contract-data";
const KEY = "estateflow-contracts";
const rec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
export function loadContracts(): Contract[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((v) => {
      if (
        !rec(v) ||
        typeof v.id !== "string" ||
        typeof v.dealId !== "string" ||
        typeof v.clientId !== "string" ||
        typeof v.propertyId !== "string"
      )
        return [];
      const status =
        typeof v.status === "string" &&
        CONTRACT_STATUSES.includes(v.status as ContractStatus)
          ? (v.status as ContractStatus)
          : "Draft";
      return [
        {
          ...(v as Contract),
          status,
          versions: Array.isArray(v.versions) ? v.versions : [],
          clauses: Array.isArray(v.clauses)
            ? v.clauses.filter((x): x is string => typeof x === "string")
            : [],
        },
      ];
    });
  } catch {
    return [];
  }
}
export function saveContracts(items: readonly Contract[]) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}
export function createContract(
  deal: Deal,
  client: Client,
  property: Property,
): Contract | null {
  const offer = getAcceptedOffer(deal);
  if (!offer) return null;
  return createContractForOffer(deal, offer.id, client, property);
}
export function createContractForOffer(
  deal: Deal,
  offerId: string,
  client: Client,
  property: Property,
): Contract | null {
  const offer = deal.offers.find(
    (candidate) => candidate.id === offerId && candidate.status === "Accepted",
  );
  if (!offer) return null;
  const now = new Date().toISOString();
  const type = deal.type;
  const snapshot: ContractSnapshot = {
    contractNumber: `EF-${type === "Sale" ? "S" : "R"}-${now.slice(0, 10).replaceAll("-", "")}-${deal.id.slice(-4)}`,
    type,
    clientName: client.name,
    clientPhone: client.phone,
    ownerName: property.ownerName,
    propertyTitle: property.title,
    propertyLocation: property.location,
    agreedValueMinor: offer.amountMinor,
    currency: deal.currency,
    depositMinor: 0,
    commissionMinor: calculateCommission(
      getCommissionBase(deal),
      deal.commission,
    ).agencyMinor,
    startDate: now.slice(0, 10),
    endDate: "",
    terms:
      type === "Sale"
        ? "The buyer agrees to purchase and the owner agrees to sell the described property subject to the clauses below."
        : "The tenant agrees to rent and the owner agrees to lease the described property for the stated term, subject to the clauses below.",
    clauses:
      type === "Sale"
        ? [
            "The agreed value and payment schedule form part of this agreement.",
            "Ownership documents and transfer requirements must be verified before completion.",
            "Possession transfers only after the agreed completion conditions are met.",
          ]
        : [
            "Rent and deposit are payable according to the agreed schedule.",
            "The tenant will use the property responsibly and report material damage.",
            "Renewal, utilities, maintenance, and early termination require written agreement.",
          ],
    notes: "",
    responsibleAgent: deal.assignedAgent,
  };
  return {
    ...snapshot,
    id: `CON-${now.replace(/\D/g, "")}`,
    dealId: deal.id,
    clientId: client.id,
    propertyId: property.id,
    offerId: offer.id,
    status: "Draft",
    versions: [],
    createdAt: now,
    updatedAt: now,
  };
}
export function getEligibleContractOffers(
  deals: readonly Deal[],
  contracts: readonly Contract[],
) {
  const contractedOfferIds = new Set(
    contracts.map((contract) => contract.offerId),
  );
  return deals.flatMap((deal) =>
    deal.offers
      .filter(
        (offer) =>
          offer.status === "Accepted" && !contractedOfferIds.has(offer.id),
      )
      .map((offer) => ({ deal, offer })),
  );
}
export function updateContract(
  current: Contract,
  patch: Partial<ContractSnapshot>,
): Contract {
  if (current.status === "Signed") return current;
  const changed = Object.keys(patch).filter(
    (k) =>
      JSON.stringify(current[k as keyof Contract]) !==
      JSON.stringify(patch[k as keyof ContractSnapshot]),
  );
  if (!changed.length) return current;
  const now = new Date().toISOString();
  const snapshot: ContractSnapshot = {
    contractNumber: current.contractNumber,
    type: current.type,
    clientName: current.clientName,
    clientPhone: current.clientPhone,
    ownerName: current.ownerName,
    propertyTitle: current.propertyTitle,
    propertyLocation: current.propertyLocation,
    agreedValueMinor: current.agreedValueMinor,
    currency: current.currency,
    depositMinor: current.depositMinor,
    commissionMinor: current.commissionMinor,
    startDate: current.startDate,
    endDate: current.endDate,
    terms: current.terms,
    clauses: [...current.clauses],
    notes: current.notes,
    responsibleAgent: current.responsibleAgent,
  };
  return {
    ...current,
    ...patch,
    versions: [
      ...current.versions,
      {
        id: `VER-${now.replace(/\D/g, "")}`,
        version: current.versions.length + 1,
        changedFields: changed,
        summary: `Updated ${changed.join(", ")}`,
        snapshot,
        createdAt: now,
      },
    ],
    updatedAt: now,
  };
}
export function signContract(
  current: Contract,
  now = new Date().toISOString(),
): Contract {
  return current.status === "Signed"
    ? current
    : {
        ...current,
        status: "Signed",
        signedAt: now,
        signedSnapshot: {
          contractNumber: current.contractNumber,
          type: current.type,
          clientName: current.clientName,
          clientPhone: current.clientPhone,
          ownerName: current.ownerName,
          propertyTitle: current.propertyTitle,
          propertyLocation: current.propertyLocation,
          agreedValueMinor: current.agreedValueMinor,
          currency: current.currency,
          depositMinor: current.depositMinor,
          commissionMinor: current.commissionMinor,
          startDate: current.startDate,
          endDate: current.endDate,
          terms: current.terms,
          clauses: [...current.clauses],
          notes: current.notes,
          responsibleAgent: current.responsibleAgent,
        },
        updatedAt: now,
      };
}
