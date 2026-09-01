// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  deleteDocumentFile,
  getDocumentFile,
  putDocumentFile,
  validateDocument,
} from "./document-storage";
describe("document storage", () => {
  it("validates type and size", () => {
    expect(validateDocument({ type: "text/plain", size: 10 })).toMatch(
      /unsupported/i,
    );
    expect(
      validateDocument({ type: "application/pdf", size: 11 * 1024 * 1024 }),
    ).toMatch(/too large/i);
    expect(validateDocument({ type: "application/pdf", size: 10 })).toBe("");
  });
  it("stores replaces and deletes blobs in IndexedDB", async () => {
    await putDocumentFile(
      "DOC-TEST",
      new Blob(["first"], { type: "application/pdf" }),
    );
    expect(await getDocumentFile("DOC-TEST")).toBeDefined();
    await putDocumentFile(
      "DOC-TEST",
      new Blob(["second"], { type: "application/pdf" }),
    );
    expect(await getDocumentFile("DOC-TEST")).toBeDefined();
    await deleteDocumentFile("DOC-TEST");
    expect(await getDocumentFile("DOC-TEST")).toBeUndefined();
  });
});
