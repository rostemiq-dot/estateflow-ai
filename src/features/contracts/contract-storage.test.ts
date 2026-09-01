import { describe, expect, it } from "vitest";
import { clients } from "../clients/client-data";
import { properties } from "../properties/property-data";
import { createDeal } from "../deals/deal-storage";
import { acceptOffer } from "../deals/deal-utils";
import {
  createContract,
  getEligibleContractOffers,
  signContract,
  updateContract,
} from "./contract-storage";
describe("contracts", () => {
  it("creates only from accepted offers and preserves links", () => {
    const deal = createDeal(
      {
        title: "Sale",
        clientId: clients[0].id,
        propertyId: properties[0].id,
        type: "Sale",
        stage: "Offer Made",
        expectedValueMinor: 10000,
        currency: "USD",
        probability: 80,
        assignedAgent: "M",
        nextAction: "",
        nextActionAt: "",
        expectedCloseDate: "",
        notes: "",
      },
      [],
    );
    expect(createContract(deal, clients[0], properties[0])).toBeNull();
    deal.offers = [
      {
        id: "OFF",
        amountMinor: 9000,
        date: "2026-07-23",
        expirationDate: "",
        conditions: "",
        notes: "",
        status: "Sent",
        createdAt: "2026-07-23T00:00:00Z",
        updatedAt: "2026-07-23T00:00:00Z",
      },
    ];
    const accepted = acceptOffer(deal, "OFF", "2026-07-23T01:00:00Z");
    const contract = createContract(accepted, clients[0], properties[0]);
    expect(contract).not.toBeNull();
    expect(contract?.dealId).toBe(deal.id);
    expect(contract?.agreedValueMinor).toBe(9000);
  });
  it("records versions and locks a signed snapshot", () => {
    const deal = createDeal(
      {
        title: "Sale",
        clientId: clients[0].id,
        propertyId: properties[0].id,
        type: "Sale",
        stage: "Contract",
        expectedValueMinor: 10000,
        currency: "USD",
        probability: 90,
        assignedAgent: "M",
        nextAction: "",
        nextActionAt: "",
        expectedCloseDate: "",
        notes: "",
      },
      [],
    );
    deal.offers = [
      {
        id: "OFF",
        amountMinor: 9000,
        date: "",
        expirationDate: "",
        conditions: "",
        notes: "",
        status: "Accepted",
        createdAt: "2026-07-23T00:00:00Z",
        updatedAt: "2026-07-23T00:00:00Z",
      },
    ];
    const created = createContract(deal, clients[0], properties[0]);
    expect(created).not.toBeNull();
    if (!created) return;
    const edited = updateContract(created, {
      notes: "Reviewed",
      clauses: ["A", "B"],
    });
    expect(edited.versions).toHaveLength(1);
    expect(edited.versions[0].changedFields).toContain("clauses");
    const signed = signContract(edited, "2026-07-24T00:00:00Z");
    const attempted = updateContract(signed, { notes: "Changed later" });
    expect(attempted.notes).toBe("Reviewed");
    expect(attempted.signedSnapshot?.notes).toBe("Reviewed");
  });
  it("prevents duplicate contracts for the same accepted offer", () => {
    const deal = createDeal(
      {
        title: "Unique offer",
        clientId: clients[0].id,
        propertyId: properties[0].id,
        type: "Sale",
        stage: "Contract",
        expectedValueMinor: 10000,
        currency: "USD",
        probability: 90,
        assignedAgent: "M",
        nextAction: "",
        nextActionAt: "",
        expectedCloseDate: "",
        notes: "",
      },
      [],
    );
    deal.offers = [
      {
        id: "OFF-UNIQUE",
        amountMinor: 9000,
        date: "",
        expirationDate: "",
        conditions: "",
        notes: "",
        status: "Accepted",
        createdAt: "2026-07-23T00:00:00Z",
        updatedAt: "2026-07-23T00:00:00Z",
      },
    ];
    const contract = createContract(deal, clients[0], properties[0]);
    expect(getEligibleContractOffers([deal], [])).toHaveLength(1);
    expect(contract).not.toBeNull();
    expect(
      getEligibleContractOffers([deal], contract ? [contract] : []),
    ).toHaveLength(0);
  });
});
