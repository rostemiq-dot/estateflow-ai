import type { Property } from "../properties/property-data";
import {
  type Commission,
  type Deal,
  type DealStage,
  type Offer,
  type PaymentRecord,
  type PaymentSchedule,
} from "./deal-data";

export function toMinorUnits(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromMinorUnits(value: number) {
  return Math.max(0, Math.trunc(value)) / 100;
}

// Shared formatter for any already-major-unit amount (e.g. dollars/dinars, not cents).
export function formatCurrencyAmount(
  amount: number | string,
  currency: "USD" | "IQD",
) {
  const numeric = Number(amount);
  const safeAmount = Number.isFinite(numeric) ? numeric : 0;
  const hasFraction = Math.round(safeAmount * 100) % 100 !== 0;
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: hasFraction ? 2 : 0,
    minimumFractionDigits: hasFraction ? 2 : 0,
    useGrouping: true,
  }).format(safeAmount);

  return currency === "USD" ? `${formatted}$` : `${formatted} IQD`;
}

export function formatMoney(amountMinor: number, currency: "USD" | "IQD") {
  return formatCurrencyAmount(fromMinorUnits(amountMinor), currency);
}

export function calculateCommission(
  baseAmountMinor: number,
  commission: Commission,
) {
  const agencyMinor =
    commission.mode === "Fixed"
      ? Math.max(0, Math.trunc(commission.fixedAmountMinor))
      : Math.round(
          (Math.max(0, Math.trunc(baseAmountMinor)) *
            Math.max(0, commission.rateBasisPoints)) /
            10_000,
        );
  const agentMinor = Math.round(
    (agencyMinor * Math.max(0, commission.agentShareBasisPoints)) / 10_000,
  );

  return {
    agencyMinor,
    agentMinor,
    agencyRetainedMinor: agencyMinor - agentMinor,
  };
}

export function getAcceptedOffer(deal: Pick<Deal, "offers">) {
  return deal.offers.find((offer) => offer.status === "Accepted");
}

export function getCommissionBase(deal: Deal) {
  return getAcceptedOffer(deal)?.amountMinor ?? deal.expectedValueMinor;
}

export function getPaidAmount(schedule: PaymentSchedule) {
  return schedule.records.reduce(
    (total, record) => total + record.amountMinor,
    0,
  );
}

export function getRemainingAmount(schedule: PaymentSchedule) {
  return Math.max(0, schedule.amountMinor - getPaidAmount(schedule));
}

export function derivePaymentStatus(
  schedule: PaymentSchedule,
  today = new Date(),
) {
  if (schedule.status === "Cancelled") {
    return "Cancelled" as const;
  }
  const paid = getPaidAmount(schedule);
  if (paid >= schedule.amountMinor) {
    return "Paid" as const;
  }
  if (paid > 0) {
    return "Partially Paid" as const;
  }
  const due = new Date(`${schedule.dueDate}T23:59:59`);
  return schedule.dueDate && due.getTime() < today.getTime()
    ? ("Overdue" as const)
    : ("Pending" as const);
}

export function validatePaymentRecord(
  schedule: PaymentSchedule,
  amountMinor: number,
) {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return "Payment amount must be greater than zero.";
  }
  if (amountMinor > getRemainingAmount(schedule)) {
    return "Payment cannot exceed the remaining balance.";
  }
  if (schedule.status === "Cancelled") {
    return "Cancelled payments cannot receive records.";
  }
  return "";
}

export function addPaymentRecord(
  schedule: PaymentSchedule,
  record: PaymentRecord,
  today = new Date(),
) {
  const validationError = validatePaymentRecord(schedule, record.amountMinor);
  if (validationError) {
    return { ok: false as const, message: validationError };
  }
  const nextSchedule = {
    ...schedule,
    records: [...schedule.records, record],
    updatedAt: record.createdAt,
  };
  return {
    ok: true as const,
    schedule: {
      ...nextSchedule,
      status: derivePaymentStatus(nextSchedule, today),
    },
  };
}

export function acceptOffer(deal: Deal, offerId: string, now: string): Deal {
  const accepted = deal.offers.find((offer) => offer.id === offerId);
  if (!accepted) {
    return deal;
  }
  return {
    ...deal,
    stage: "Contract",
    expectedValueMinor: accepted.amountMinor,
    probability: Math.max(deal.probability, 90),
    offers: deal.offers.map((offer) => ({
      ...offer,
      status:
        offer.id === offerId
          ? "Accepted"
          : offer.status === "Accepted"
            ? "Countered"
            : offer.status,
      updatedAt: now,
    })),
    history: [
      {
        id: `HIST-${now}-${offerId}`,
        type: "Offer",
        text: `Offer ${offerId} accepted; deal moved to Contract.`,
        createdAt: now,
      },
      ...deal.history,
    ],
    updatedAt: now,
  };
}

export function canTransitionDeal(
  deal: Deal,
  nextStage: DealStage,
  lostReason = "",
) {
  if (nextStage === "Closed Lost" && !lostReason.trim()) {
    return { ok: false as const, message: "A loss reason is required." };
  }
  if (
    nextStage === "Closed Won" &&
    !getAcceptedOffer(deal) &&
    deal.expectedValueMinor <= 0
  ) {
    return {
      ok: false as const,
      message: "A deal value or accepted offer is required before closing.",
    };
  }
  return { ok: true as const };
}

export function getClosedPropertyStatus(
  deal: Pick<Deal, "type">,
): Property["status"] {
  return deal.type === "Sale" ? "Sold" : "Rented";
}

export function isClosedStage(stage: DealStage) {
  return stage === "Closed Won" || stage === "Closed Lost";
}

export function createCounterOffer(
  source: Offer,
  amountMinor: number,
  now: string,
): { source: Offer; counter: Offer } {
  return {
    source: { ...source, status: "Countered", updatedAt: now },
    counter: {
      ...source,
      id: `OFF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      parentOfferId: source.id,
      amountMinor,
      status: "Draft",
      date: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function getDealMetrics(deals: readonly Deal[]) {
  const visibleDeals = deals.filter((deal) => !deal.archived);
  const active = visibleDeals.filter((deal) => !isClosedStage(deal.stage));
  const won = visibleDeals.filter((deal) => deal.stage === "Closed Won");
  const expectedCommissionMinor = active.reduce(
    (total, deal) =>
      total +
      calculateCommission(getCommissionBase(deal), deal.commission).agencyMinor,
    0,
  );
  const schedules = visibleDeals.flatMap((deal) => deal.payments);
  const collectedPaymentsMinor = schedules.reduce(
    (total, schedule) => total + getPaidAmount(schedule),
    0,
  );
  const outstandingBalanceMinor = schedules.reduce(
    (total, schedule) =>
      schedule.status === "Cancelled"
        ? total
        : total + getRemainingAmount(schedule),
    0,
  );
  const overduePayments = schedules.filter(
    (schedule) => derivePaymentStatus(schedule) === "Overdue",
  ).length;

  return {
    activeDeals: active.length,
    pipelineValueMinor: active.reduce(
      (total, deal) => total + deal.expectedValueMinor,
      0,
    ),
    wonDeals: won.length,
    expectedCommissionMinor,
    collectedPaymentsMinor,
    outstandingBalanceMinor,
    overduePayments,
  };
}
