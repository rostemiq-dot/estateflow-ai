import { describe, expect, it } from "vitest";
import { clients } from "../clients/client-data";
import { properties } from "../properties/property-data";
import { createDeal } from "../deals/deal-storage";
import {
  buildReport,
  getDateRange,
  inDateRange,
  rowsToCsv,
} from "./report-utils";
describe("reports", () => {
  it("filters exact calendar periods", () => {
    const range = getDateRange("This month", new Date("2026-07-25T12:00:00"));
    expect(inDateRange("2026-07-01T00:00:00", range)).toBe(true);
    expect(inDateRange("2026-06-30T23:59:59", range)).toBe(false);
  });
  it("keeps USD and IQD totals separate", () => {
    const usd = createDeal(
        {
          title: "USD",
          clientId: clients[0].id,
          propertyId: properties[0].id,
          type: "Sale",
          stage: "Lead",
          expectedValueMinor: 10000,
          currency: "USD",
          probability: 1,
          assignedAgent: "M",
          nextAction: "",
          nextActionAt: "",
          expectedCloseDate: "",
          notes: "",
        },
        [],
      ),
      iqd = {
        ...usd,
        id: "IQD",
        currency: "IQD" as const,
        expectedValueMinor: 50000,
      };
    const report = buildReport(
      [usd, iqd],
      properties,
      clients,
      [],
      [],
      [],
      [],
      getDateRange("All time"),
    );
    expect(report.USD.pipelineMinor).toBe(10000);
    expect(report.IQD.pipelineMinor).toBe(50000);
  });
  it("exports escaped CSV tables", () =>
    expect(rowsToCsv([{ name: 'A "deal"', value: 2 }])).toContain(
      'A ""deal""',
    ));
});
