import {
  serializeFilename,
  deserializeFilename,
  trimFileAndExt,
  stringByteLength,
} from "./fs";

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

describe("stringByteLength", () => {
  it("should return byte length of string", () => {
    expect(stringByteLength("")).toBe(0);
    expect(stringByteLength("a")).toBe(1);
    expect(stringByteLength("🦄")).toBe(4);
    expect(stringByteLength("你好")).toBe(6);
  });
});

describe("trimFileAndExt", () => {
  it("should trim filename", () => {
    expect(trimFileAndExt("file.txt", 6)).toBe("fi.txt");
    expect(trimFileAndExt("file.txt", 8)).toBe("file.txt");
    expect(trimFileAndExt("file.md", 9)).toBe("file.md");
    expect(trimFileAndExt("你好.md", 2)).toBe("你.md");
  });
});
