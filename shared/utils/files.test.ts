import {
  bytesToHumanReadable,
  dataUrlToBlob,
  dataUrlToFile,
  getFileNameFromUrl,
} from "./files";

// Mock the browser detection with a mutable value
let mockIsMacValue = false;

vi.mock("./browser", () => ({
  get isMac() {
    return mockIsMacValue;
  },
}));

describe("bytesToHumanReadable", () => {
  describe("on macOS (decimal units)", () => {
    beforeEach(() => {
      mockIsMacValue = true;
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
      mockIsMacValue = false;
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
      mockIsMacValue = true;
      expect(bytesToHumanReadable(fileSize)).toBe("91.44 MB");
    });

    it("displays correctly on Windows (binary)", () => {
      mockIsMacValue = false;
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

  it("decodes percent-encoded filenames", () => {
    expect(getFileNameFromUrl("https://example.com/My%20Report.pdf")).toBe(
      "My Report.pdf"
    );
    expect(getFileNameFromUrl("https://example.com/caf%C3%A9%20menu.png")).toBe(
      "café menu.png"
    );
    expect(
      getFileNameFromUrl("https://example.com/report%20final.pdf?v=2#top")
    ).toBe("report final.pdf");
  });

  it("falls back to the raw filename on malformed encoding", () => {
    expect(getFileNameFromUrl("https://example.com/bad%name.txt")).toBe(
      "bad%name.txt"
    );
  });
});

describe("dataUrlToBlob", () => {
  it.each(["data:image/png;base64,AP/+", "data:image/png;base64,AP%2F%2B"])(
    "decodes base64 binary data: %s",
    async (url) => {
      const blob = dataUrlToBlob(url);
      expect(blob.type).toBe("image/png");
      expect(await readBlobBytes(blob)).toEqual([0, 255, 254]);
    }
  );

  it("decodes an empty payload", async () => {
    expect(
      await readBlobBytes(dataUrlToBlob("data:image/png;base64,"))
    ).toEqual([]);
  });

  it.each([
    "data:image/svg+xml,%3Csvg%3E%3Ctext%3EHello%2C%20%E4%B8%96%E7%95%8C%3C%2Ftext%3E%3C%2Fsvg%3E",
    "data:image/svg+xml,<svg><text>Hello, 世界</text></svg>",
  ])("decodes SVG data without base64 encoding: %s", async (url) => {
    const blob = dataUrlToBlob(url);
    expect(blob.type).toBe("image/svg+xml");
    expect(await readBlobBytes(blob)).toEqual(
      Array.from(
        new TextEncoder().encode("<svg><text>Hello, 世界</text></svg>")
      )
    );
  });

  it.each(["https://example.com/image.png", "data:image/png;base64"])(
    "rejects an invalid data URL: %s",
    (url) => {
      expect(() => dataUrlToBlob(url)).toThrow("Invalid data URL");
    }
  );
});

describe("dataUrlToFile", () => {
  it("preserves the MIME type and content of a non-base64 image", async () => {
    const url = "data:image/svg+xml,%3Csvg%2F%3E";
    const file = dataUrlToFile(url, "pasted-image");
    expect(file.name).toBe("pasted-image");
    expect(file.type).toBe("image/svg+xml");
    expect(await readBlobBytes(file)).toEqual([60, 115, 118, 103, 47, 62]);
  });
});

async function readBlobBytes(blob: Blob): Promise<number[]> {
  if (typeof FileReader === "undefined") {
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(Array.from(new Uint8Array(reader.result)));
      } else {
        reject(new Error("Expected an ArrayBuffer"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}
