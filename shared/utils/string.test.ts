import { hashString } from "./string";

describe("hashString", () => {
  it("returns a hex string", () => {
    expect(hashString("hello")).toMatch(/^[0-9a-f]+$/);
  });

  it("returns consistent results for the same input", () => {
    expect(hashString("test")).toBe(hashString("test"));
  });

  it("returns different hashes for different inputs", () => {
    expect(hashString("abc")).not.toBe(hashString("def"));
  });

  it("handles empty string", () => {
    expect(hashString("")).toMatch(/^[0-9a-f]+$/);
  });
});
