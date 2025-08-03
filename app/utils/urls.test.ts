import { decodeURIComponentSafe } from "./urls";

describe("decodeURIComponentSafe", () => {
  test("to handle % symbols", () => {
    expect(decodeURIComponentSafe("%")).toBe("%");
    expect(decodeURIComponentSafe("%25")).toBe("%");
  });

  test("to correctly account for encoded symbols", () => {
    expect(decodeURIComponentSafe("%7D")).toBe("}");
    expect(decodeURIComponentSafe("%2F")).toBe("/");
  });

  test("to handle malformed percent encoding", () => {
    // Single % at end of string
    expect(decodeURIComponentSafe("test%")).toBe("test%");

    // % followed by single hex digit
    expect(decodeURIComponentSafe("test%A")).toBe("test%A");

    // % followed by non-hex characters
    expect(decodeURIComponentSafe("test%GG")).toBe("test%GG");
    expect(decodeURIComponentSafe("test%XY")).toBe("test%XY");

    // % followed by space
    expect(decodeURIComponentSafe("test% ")).toBe("test% ");

    // Multiple malformed % symbols
    expect(decodeURIComponentSafe("%test%")).toBe("%test%");
    expect(decodeURIComponentSafe("%A%B")).toBe("%A%B");
  });

  test("to handle mixed valid and invalid percent encoding", () => {
    // Valid encoding mixed with invalid
    expect(decodeURIComponentSafe("%20test%")).toBe(" test%");
    expect(decodeURIComponentSafe("%7D%invalid")).toBe("}%invalid");
    expect(decodeURIComponentSafe("valid%20%")).toBe("valid %");

    // Complex mixed case
    expect(decodeURIComponentSafe("%20%A%2F%")).toBe(" %A/%");
  });

  test("to handle edge cases", () => {
    // Empty string
    expect(decodeURIComponentSafe("")).toBe("");

    // Only % symbols
    expect(decodeURIComponentSafe("%%%")).toBe("%%%");

    // Language specific characters
    expect(decodeURIComponentSafe("%E3%81%AB%E3%81%BB%E3%82%93%E3%81%94")).toBe(
      "にほんご"
    );

    // % at various positions
    expect(decodeURIComponentSafe("%start")).toBe("%start");
    expect(decodeURIComponentSafe("mid%dle")).toBe("mid%dle");
    expect(decodeURIComponentSafe("end%")).toBe("end%");

    // Already encoded %25 should decode to %
    expect(decodeURIComponentSafe("%25%25")).toBe("%%");
  });
});
