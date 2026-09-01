// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mergeNotificationState } from "./notification-storage";
describe("notification dismissal", () => {
  it("preserves dismissal until the event signature changes", () => {
    const prior = [
      {
        key: "task:1",
        signature: "v1",
        read: true,
        dismissed: true,
        updatedAt: "x",
      },
    ];
    expect(
      mergeNotificationState(prior, [{ key: "task:1", signature: "v1" }])[0]
        .dismissed,
    ).toBe(true);
    const changed = mergeNotificationState(prior, [
      { key: "task:1", signature: "v2" },
    ])[0];
    expect(changed.dismissed).toBe(false);
    expect(changed.read).toBe(false);
  });
});
