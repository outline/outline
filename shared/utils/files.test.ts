import { bytesToHumanReadable, getFileNameFromUrl } from "./files";
import * as browser from "./browser";

// Mock the browser detection
jest.mock("./browser", () => ({
  isMac: jest.fn(),
}));

const mockIsMac = browser.isMac as jest.MockedFunction<typeof browser.isMac>;

describe("bytesToHumanReadable", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("on macOS (decimal units)", () => {
    beforeEach(() => {
      mockIsMac.mockReturnValue(true);
    });

    it("outputs readable string using decimal units", () => {
      expect(bytesToHumanReadable(0)).toBe("0 Bytes");
      expect(bytesToHumanReadable(0.0)).toBe("0 Bytes");
      expect(bytesToHumanReadable(33)).toBe("33 Bytes");
      expect(bytesToHumanReadable(500)).toBe("500 Bytes");
      expect(bytesToHumanReadable(1000)).toBe("1 KB");
      expect(bytesToHumanReadable(15000)).toBe("15 KB");
      expect(bytesToHumanReadable(12345)).toBe("12.35 KB");
      expect(bytesToHumanReadable(123456)).toBe("123.46 KB");
      expect(bytesToHumanReadable(1234567)).toBe("1.23 MB");
      expect(bytesToHumanReadable(1234567890)).toBe("1.23 GB");
      expect(bytesToHumanReadable(undefined)).toBe("0 Bytes");
    });
  });

  describe("on Windows/other platforms (binary units)", () => {
    beforeEach(() => {
      mockIsMac.mockReturnValue(false);
    });

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
      expect(bytesToHumanReadable(1073741824)).toBe("1 GB");
      expect(bytesToHumanReadable(undefined)).toBe("0 Bytes");
    });
  });

  describe("platform-specific behavior for issue #10085", () => {
    const fileSize = 91435827; // 87.2MB in binary, ~91.44MB in decimal

    it("displays correctly on macOS (decimal)", () => {
      mockIsMac.mockReturnValue(true);
      expect(bytesToHumanReadable(fileSize)).toBe("91.44 MB");
    });

    it("displays correctly on Windows (binary)", () => {
      mockIsMac.mockReturnValue(false);
      expect(bytesToHumanReadable(fileSize)).toBe("87.2 MB");
    });
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
