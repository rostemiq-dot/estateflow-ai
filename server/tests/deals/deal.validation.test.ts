import { describe, expect, it } from "vitest";
import {
  createDealSchema,
  listDealsQuerySchema,
  stageChangeSchema,
  updateDealSchema,
} from "../../src/modules/deals/validators/deal.validators.js";
import { input } from "./deal.fixtures.js";
describe("deal validation", () => {
  it("accepts valid financial data", () =>
    expect(createDealSchema.safeParse(input).success).toBe(true));
  it.each([
    [{ ...input, askingPrice: "-1" }, "negative"],
    [{ ...input, expectedCommission: "101" }, "percentage"],
    [{ ...input, stage: "WON", status: "OPEN" }, "won mismatch"],
    [
      {
        ...input,
        stage: "LOST",
        status: "LOST",
        closedAt: "2026-07-28T10:00:00Z",
      },
      "lost reason",
    ],
  ])("rejects %s", (value) =>
    expect(createDealSchema.safeParse(value).success).toBe(false),
  );
  it("requires closing fields and validates ranges", () => {
    expect(stageChangeSchema.safeParse({ stage: "WON" }).success).toBe(false);
    expect(
      stageChangeSchema.safeParse({
        stage: "WON",
        closedAt: "2026-07-28T10:00:00Z",
      }).success,
    ).toBe(true);
    expect(
      listDealsQuerySchema.safeParse({ minAmount: "500", maxAmount: "100" })
        .success,
    ).toBe(false);
    expect(listDealsQuerySchema.safeParse({ pageSize: "101" }).success).toBe(
      false,
    );
    expect(updateDealSchema.safeParse({}).success).toBe(false);
  });
});
