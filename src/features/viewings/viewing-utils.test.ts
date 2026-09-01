import { describe, expect, it } from "vitest";
import { createViewing } from "./viewing-storage";
import {
  getUpcomingViewings,
  getViewingsForClient,
  getViewingsForProperty,
  sortViewings,
} from "./viewing-utils";
import type { Viewing } from "./viewing-data";

const viewings: Viewing[] = [
  {
    id: "VIEW-002",
    clientId: "CLI-2",
    propertyId: "PROP-2",
    date: "2026-07-26",
    time: "15:00",
    location: "Empire World",
    status: "Confirmed",
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
  },
  {
    id: "VIEW-001",
    clientId: "CLI-1",
    propertyId: "PROP-1",
    date: "2026-07-25",
    time: "10:00",
    location: "Italian Village",
    status: "Scheduled",
    createdAt: "2026-07-23T11:00:00.000Z",
    updatedAt: "2026-07-23T11:00:00.000Z",
  },
  {
    id: "VIEW-003",
    clientId: "CLI-1",
    propertyId: "PROP-2",
    date: "2026-07-27",
    time: "09:00",
    location: "Ankawa",
    status: "Cancelled",
    createdAt: "2026-07-23T13:00:00.000Z",
    updatedAt: "2026-07-23T13:00:00.000Z",
  },
];

describe("viewing workflow", () => {
  it("creates a unique persistent viewing record", () => {
    const viewing = createViewing(
      {
        clientId: "CLI-1",
        propertyId: "PROP-1",
        date: "2026-07-28",
        time: "12:30",
        location: "Main gate",
      },
      viewings,
    );

    expect(viewing.id).toMatch(/^VIEW-/);
    expect(viewings.some((candidate) => candidate.id === viewing.id)).toBe(
      false,
    );
    expect(viewing.status).toBe("Scheduled");
    expect(viewing.clientId).toBe("CLI-1");
    expect(viewing.propertyId).toBe("PROP-1");
  });

  it("sorts calendar records by date and time", () => {
    expect(sortViewings(viewings).map((viewing) => viewing.id)).toEqual([
      "VIEW-001",
      "VIEW-002",
      "VIEW-003",
    ]);
  });

  it("filters the same viewings by client and property", () => {
    expect(
      getViewingsForClient(viewings, "CLI-1").map((viewing) => viewing.id),
    ).toEqual(["VIEW-001", "VIEW-003"]);
    expect(
      getViewingsForProperty(viewings, "PROP-2").map((viewing) => viewing.id),
    ).toEqual(["VIEW-002", "VIEW-003"]);
  });

  it("excludes cancelled and completed records from upcoming viewings", () => {
    const result = getUpcomingViewings(
      viewings,
      new Date("2026-07-24T00:00:00.000Z"),
    );

    expect(result.map((viewing) => viewing.id)).toEqual([
      "VIEW-001",
      "VIEW-002",
    ]);
  });
});
