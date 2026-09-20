import { isStaleChunkError } from "./lazyWithRetry";

describe("isStaleChunkError", () => {
  it("matches a chunk that could not be fetched", () => {
    expect(
      isStaleChunkError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://example.com/Editor.abc123.js"
        )
      )
    ).toBe(true);
  });

  it("matches a module script that failed to import", () => {
    expect(
      isStaleChunkError(new TypeError("Importing a module script failed."))
    ).toBe(true);
  });

  it("matches a chunk with a missing export", () => {
    expect(
      isStaleChunkError(
        new SyntaxError(
          "The requested module './PluginIcon.BGMce7FN.js' does not provide an export named 't'"
        )
      )
    ).toBe(true);
  });

  it("matches a non-error value", () => {
    expect(isStaleChunkError("Importing a module script failed.")).toBe(true);
  });

  it("does not match an unrelated error", () => {
    expect(isStaleChunkError(new Error("Something went wrong"))).toBe(false);
    expect(isStaleChunkError(undefined)).toBe(false);
  });
});
