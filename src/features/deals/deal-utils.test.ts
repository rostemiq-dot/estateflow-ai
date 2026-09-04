import { describe, expect, it } from "vitest";
import type { Deal, PaymentRecord, PaymentSchedule } from "./deal-data";
import {
  acceptOffer,
  addPaymentRecord,
  calculateCommission,
  canTransitionDeal,
  createCounterOffer,
  derivePaymentStatus,
  formatMoney,
  getClosedPropertyStatus,
  getPaidAmount,
  getRemainingAmount,
  toMinorUnits,
  validatePaymentRecord,
} from "./deal-utils";

function sampleDeal(): Deal {
  return {
    id: "DEAL-1",
    title: "Test deal",
    clientId: "CLI-1",
    propertyId: "PROP-1",
    type: "Sale",
    stage: "Offer Made",
    expectedValueMinor: 100_000_00,
    currency: "USD",
    probability: 70,
    assignedAgent: "Mohammed",
    nextAction: "Review",
    nextActionAt: "2026-07-25T10:00",
    expectedCloseDate: "2026-08-01",
    notes: "",
    lostReason: "",
    archived: false,
    offers: [
      {
        id: "OFF-1",
        amountMinor: 95_000_00,
        date: "2026-07-23",
        expirationDate: "2026-07-30",
        conditions: "",
        notes: "",
        status: "Sent",
        createdAt: "2026-07-23T09:00:00.000Z",
        updatedAt: "2026-07-23T09:00:00.000Z",
      },
    ],
    commission: {
      mode: "Percentage",
      rateBasisPoints: 250,
      fixedAmountMinor: 0,
      agentShareBasisPoints: 4_000,
      confirmed: false,
    },
    payments: [],
    history: [],
    createdAt: "2026-07-23T09:00:00.000Z",
    updatedAt: "2026-07-23T09:00:00.000Z",
  };
}

function sampleSchedule(): PaymentSchedule {
  return {
    id: "PAY-1",
    label: "Deposit",
    amountMinor: 10_000,
    dueDate: "2026-07-20",
    status: "Pending",
    records: [],
    notes: "",
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-01T09:00:00.000Z",
  };
}

describe("deal money calculations", () => {
  it("converts decimal money to exact integer minor units", () => {
    expect(toMinorUnits(10.1 + 20.2)).toBe(3030);
    expect(toMinorUnits(-10)).toBe(0);
  });

  it("formats USD and IQD without unnecessary decimal zeros", () => {
    expect(formatMoney(20_000, "USD")).toBe("$200");
    expect(formatMoney(30_000_000, "IQD")).toBe("30,000 IQD");
  });

  it("calculates percentage and fixed commissions with agent shares", () => {
    expect(
      calculateCommission(100_000_00, {
        mode: "Percentage",
        rateBasisPoints: 250,
        fixedAmountMinor: 0,
        agentShareBasisPoints: 4_000,
        confirmed: false,
      }),
    ).toEqual({
      agencyMinor: 2_500_00,
      agentMinor: 1_000_00,
      agencyRetainedMinor: 1_500_00,
    });
    expect(
      calculateCommission(1, {
        mode: "Fixed",
        rateBasisPoints: 0,
        fixedAmountMinor: 777_00,
        agentShareBasisPoints: 5_000,
        confirmed: true,
      }).agencyMinor,
    ).toBe(777_00);
  });
});

describe("offers and stages", () => {
  it("accepts an offer and automatically moves the deal to Contract", () => {
    const updated = acceptOffer(
      sampleDeal(),
      "OFF-1",
      "2026-07-23T10:00:00.000Z",
    );
    expect(updated.stage).toBe("Contract");
    expect(updated.expectedValueMinor).toBe(95_000_00);
    expect(updated.offers[0].status).toBe("Accepted");
    expect(updated.history[0].type).toBe("Offer");
  });

  it("creates a linked counteroffer without removing its source", () => {
    const source = sampleDeal().offers[0];
    const result = createCounterOffer(
      source,
      97_500_00,
      "2026-07-23T10:00:00.000Z",
    );
    expect(result.source.status).toBe("Countered");
    expect(result.counter.parentOfferId).toBe(source.id);
    expect(result.counter.amountMinor).toBe(97_500_00);
  });

  it("requires a reason for Closed Lost and validates won value", () => {
    expect(canTransitionDeal(sampleDeal(), "Closed Lost", "").ok).toBe(false);
    expect(
      canTransitionDeal(sampleDeal(), "Closed Lost", "Financing declined").ok,
    ).toBe(true);
    expect(getClosedPropertyStatus(sampleDeal())).toBe("Sold");
    expect(getClosedPropertyStatus({ type: "Rental" })).toBe("Rented");
  });
});

describe("payment validation", () => {
  it("rejects negative, zero, and impossible overpayments", () => {
    const schedule = sampleSchedule();
    expect(validatePaymentRecord(schedule, -1)).toMatch(/greater than zero/i);
    expect(validatePaymentRecord(schedule, 0)).toMatch(/greater than zero/i);
    expect(validatePaymentRecord(schedule, 10_001)).toMatch(/cannot exceed/i);
  });

  it("tracks partial and complete payment balances", () => {
    const firstRecord: PaymentRecord = {
      id: "REC-1",
      amountMinor: 4_000,
      paidDate: "2026-07-23",
      method: "Cash",
      reference: "",
      notes: "",
      createdAt: "2026-07-23T10:00:00.000Z",
    };
    const partial = addPaymentRecord(
      sampleSchedule(),
      firstRecord,
      new Date("2026-07-23T12:00:00.000Z"),
    );
    expect(partial.ok).toBe(true);
    if (!partial.ok) return;
    expect(partial.schedule.status).toBe("Partially Paid");
    expect(getPaidAmount(partial.schedule)).toBe(4_000);
    expect(getRemainingAmount(partial.schedule)).toBe(6_000);

    const complete = addPaymentRecord(
      partial.schedule,
      { ...firstRecord, id: "REC-2", amountMinor: 6_000 },
      new Date("2026-07-23T12:00:00.000Z"),
    );
    expect(complete.ok).toBe(true);
    if (!complete.ok) return;
    expect(complete.schedule.status).toBe("Paid");
    expect(getRemainingAmount(complete.schedule)).toBe(0);
  });

  it("derives overdue only for unpaid past-due schedules", () => {
    expect(
      derivePaymentStatus(
        sampleSchedule(),
        new Date("2026-07-23T12:00:00.000Z"),
      ),
    ).toBe("Overdue");
  });
});
