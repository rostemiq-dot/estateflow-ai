import { Currency, PropertyType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  createClientSchema,
  createPreferenceSchema,
  listClientsQuerySchema,
  updateClientSchema,
} from "../../src/modules/clients/validators/client.validators.js";
import { createClientInput } from "./client.fixtures.js";

describe("client validation", () => {
  it("normalizes valid phone and email values", () => {
    const parsed = createClientSchema.parse({
      ...createClientInput,
      email: " SARA@EXAMPLE.COM ",
      phone: "+964 (750) 123-4567",
    });
    expect(parsed.email).toBe("sara@example.com");
    expect(parsed.phone).toBe("+9647501234567");
  });

  it.each([
    [{ ...createClientInput, phone: "123" }, "phone"],
    [{ ...createClientInput, email: "invalid" }, "email"],
    [{ ...createClientInput, rating: 6 }, "rating"],
    [{ ...createClientInput, agencyId: "forbidden" }, "mass assignment"],
  ])("rejects invalid %s input", (input) => {
    expect(createClientSchema.safeParse(input).success).toBe(false);
  });

  it("rejects empty updates and invalid pagination", () => {
    expect(updateClientSchema.safeParse({}).success).toBe(false);
    expect(listClientsQuerySchema.safeParse({ pageSize: "101" }).success).toBe(
      false,
    );
    expect(listClientsQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
    });
  });

  it("validates budget and area ranges", () => {
    const base = {
      propertyType: PropertyType.VILLA,
      city: "Erbil",
      currency: Currency.USD,
    };
    expect(
      createPreferenceSchema.safeParse({
        ...base,
        minBudget: "500000",
        maxBudget: "100000",
      }).success,
    ).toBe(false);
    expect(
      createPreferenceSchema.safeParse({
        ...base,
        minArea: "150",
        maxArea: "300",
        minBudget: "100000",
        maxBudget: "500000",
      }).success,
    ).toBe(true);
  });
});
