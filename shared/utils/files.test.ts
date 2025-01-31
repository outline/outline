import { bytesToHumanReadable, getFileNameFromUrl } from "./files";

describe("bytesToHumanReadable", () => {
  it("outputs readable string", () => {
    expect(bytesToHumanReadable(0)).toBe("0 Bytes");
    expect(bytesToHumanReadable(0.0)).toBe("0 Bytes");
    expect(bytesToHumanReadable(33)).toBe("33 Bytes");
    expect(bytesToHumanReadable(500)).toBe("500 Bytes");
    expect(bytesToHumanReadable(1000)).toBe("1 kB");
    expect(bytesToHumanReadable(15000)).toBe("15 kB");
    expect(bytesToHumanReadable(12345)).toBe("12.34 kB");
    expect(bytesToHumanReadable(123456)).toBe("123.45 kB");
    expect(bytesToHumanReadable(1234567)).toBe("1.23 MB");
    expect(bytesToHumanReadable(1234567890)).toBe("1.23 GB");
    expect(bytesToHumanReadable(undefined)).toBe("0 Bytes");
  });
});

describe("getFileNameFromUrl", () => {
  it("returns the filename from a URL", () => {
    expect(getFileNameFromUrl("https://example.com/file")).toBe("file");
    expect(getFileNameFromUrl("https://example.com/file.txt")).toBe("file.txt");
    expect(
      getFileNameFromUrl("https://example.com/file.txt?query=string")
    ).toBe("file.txt");
    expect(getFileNameFromUrl("https://example.com/file.txt#hash")).toBe(
      "file.txt"
    );
    expect(
      getFileNameFromUrl("https://example.com/file.txt?query=string#hash")
    ).toBe("file.txt");
    expect(getFileNameFromUrl("https://example.com/")).toBe("");
  });
});
