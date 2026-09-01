import { PropertyMediaType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  createMediaSchema,
  createTagSchema,
  propertyMediaParamsSchema,
  updateMediaSchema,
} from "../../src/modules/property-metadata/validators/metadata.validators.js";
import { mediaId, mediaInput, propertyId } from "./metadata.fixtures.js";

describe("property metadata validation", () => {
  it("accepts a valid media metadata record and UUID parameters", () => {
    expect(createMediaSchema.safeParse(mediaInput).success).toBe(true);
    expect(
      propertyMediaParamsSchema.safeParse({ propertyId, mediaId }).success,
    ).toBe(true);
  });

  it.each([
    [{ ...mediaInput, mimeType: "video/mp4" }, "mismatched mime"],
    [{ ...mediaInput, displayOrder: -1 }, "negative display order"],
    [{ ...mediaInput, propertyId }, "mass-assignment field"],
    [
      { ...mediaInput, mediaType: "AUDIO" as PropertyMediaType },
      "unknown media enum",
    ],
  ])("rejects %s", (input) => {
    expect(createMediaSchema.safeParse(input).success).toBe(false);
  });

  it("validates patch bodies and tag colors", () => {
    expect(updateMediaSchema.safeParse({}).success).toBe(false);
    expect(updateMediaSchema.safeParse({ displayOrder: 2 }).success).toBe(true);
    expect(
      createTagSchema.safeParse({
        name: "Featured",
        slug: "featured",
        color: "#17A34A",
      }).success,
    ).toBe(true);
    expect(
      createTagSchema.safeParse({
        name: "Featured",
        slug: "Featured Tag",
        color: "green",
      }).success,
    ).toBe(false);
  });
});
