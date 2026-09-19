import { serializeFilename, deserializeFilename, stringByteLength } from "./fs";

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

  it("should serialize Windows-invalid filename characters", () => {
    expect(serializeFilename(`this: * ? " < > | that`)).toBe(
      "this%3A %2A %3F %22 %3C %3E %7C that"
    );
  });

  it("should serialize trailing Windows-invalid filename characters", () => {
    expect(serializeFilename("file.")).toBe("file%2E");
    expect(serializeFilename("file ")).toBe("file%20");
    expect(serializeFilename("file. ")).toBe("file%2E%20");
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

  it("should deserialize Windows-invalid filename characters", () => {
    expect(deserializeFilename("%3A %2A %3F %22 %3C %3E %7C")).toBe(
      `: * ? " < > |`
    );
  });

  it("should deserialize trailing Windows-invalid filename characters", () => {
    expect(deserializeFilename("file%2E")).toBe("file.");
    expect(deserializeFilename("file%20")).toBe("file ");
    expect(deserializeFilename("file%2E%20")).toBe("file. ");
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
