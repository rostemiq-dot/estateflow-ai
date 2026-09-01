import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../prisma/migrations/20260728230000_viewings_calendar/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("viewing activity migration", () => {
  it("durably links each activity type to one viewing", () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "client_activities_viewing_id_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "deal_activities_viewing_id_key"',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("viewing_id") REFERENCES "viewings"("id")',
    );
  });

  it("is transactional", () => {
    expect(migration.trimStart().startsWith("BEGIN;")).toBe(true);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
  });
});
