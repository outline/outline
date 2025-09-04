import { bytesToHumanReadable, getFileNameFromUrl } from "./files";

describe("bytesToHumanReadable", () => {
  it("outputs readable string using binary units", () => {
    expect(bytesToHumanReadable(0)).toBe("0 Bytes");
    expect(bytesToHumanReadable(0.0)).toBe("0 Bytes");
    expect(bytesToHumanReadable(33)).toBe("33 Bytes");
    expect(bytesToHumanReadable(500)).toBe("500 Bytes");
    expect(bytesToHumanReadable(1000)).toBe("1000 Bytes");
    expect(bytesToHumanReadable(1024)).toBe("1 KB");
    expect(bytesToHumanReadable(1536)).toBe("1.5 KB");
    expect(bytesToHumanReadable(15360)).toBe("15 KB");
    expect(bytesToHumanReadable(12345)).toBe("12.06 KB");
    expect(bytesToHumanReadable(126464)).toBe("123.5 KB");
    expect(bytesToHumanReadable(1048576)).toBe("1 MB");
    expect(bytesToHumanReadable(1291845632)).toBe("1.2 GB");
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
