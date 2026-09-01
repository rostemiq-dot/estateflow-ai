import { describe, expect, it } from "vitest";
import {
  calendarQuerySchema,
  createViewingSchema,
  listViewingsQuerySchema,
  updateViewingSchema,
} from "../../src/modules/viewings/validators/viewing.validators.js";
import { input } from "./viewing.fixtures.js";

describe("viewing validation", () => {
  it("accepts a valid viewing", () => {
    expect(createViewingSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    [{ ...input, propertyId: "invalid" }, "UUID"],
    [{ ...input, startAt: input.endAt }, "equal dates"],
    [{ ...input, endAt: input.startAt }, "reversed dates"],
    [{ ...input, timezone: "Mars/Olympus" }, "timezone"],
    [{ ...input, status: "COMPLETED" }, "completed outcome"],
    [{ ...input, status: "CANCELLED" }, "cancellation reason"],
  ])("rejects invalid %s payloads", (value) => {
    expect(createViewingSchema.safeParse(value).success).toBe(false);
  });

  it("validates status rules for partial updates", () => {
    expect(updateViewingSchema.safeParse({ status: "COMPLETED" }).success).toBe(
      true,
    );
    expect(
      updateViewingSchema.safeParse({
        status: "COMPLETED",
        outcome: "Interested",
      }).success,
    ).toBe(true);
    expect(updateViewingSchema.safeParse({}).success).toBe(false);
  });

  it.each(["CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"])(
    "rejects %s as an initial status",
    (status) => {
      expect(createViewingSchema.safeParse({ ...input, status }).success).toBe(
        false,
      );
    },
  );

  it("validates pagination and calendar ranges", () => {
    expect(listViewingsQuerySchema.safeParse({ pageSize: "101" }).success).toBe(
      false,
    );
    expect(
      calendarQuerySchema.safeParse({
        startAt: "2026-08-02T00:00:00Z",
        endAt: "2026-08-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });
});
