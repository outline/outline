// @flow
import { serializeFilename, deserializeFilename } from "./fs";

describe("serializeFilename", () => {
  it("should serialize forward slashes", () => {
    expect(serializeFilename(`/`)).toBe("%2F");
    expect(serializeFilename(`this / and / this`)).toBe(
      "this %2F and %2F this"
    );
  });

  it("should serialize back slashes", () => {
    expect(serializeFilename(`\\`)).toBe("%5C");
    expect(serializeFilename(`this \\ and \\ this`)).toBe(
      "this %5C and %5C this"
    );
  });
});

describe("deserializeFilename", () => {
  it("should deserialize forward slashes", () => {
    expect(deserializeFilename("%2F")).toBe("/");
    expect(deserializeFilename("this %2F and %2F this")).toBe(
      `this / and / this`
    );
  });

  it("should deserialize back slashes", () => {
    expect(deserializeFilename("%5C")).toBe(`\\`);
    expect(deserializeFilename("this %5C and %5C this")).toBe(
      `this \\ and \\ this`
    );
  });
});
