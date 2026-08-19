import { Hour, Minute, Week } from "@shared/utils/time";
import BaseStorage from "./BaseStorage";
import env from "@server/env";

/**
 * Mock implementation of BaseStorage for testing purposes.
 */
class MockStorage extends BaseStorage {
  public storedFiles: Array<{
    key: string;
    body: Buffer;
    contentType?: string;
    acl?: string;
  }> = [];

  async getPresignedPost() {
    return {};
  }

  async getFileStream() {
    return null;
  }

  getUploadUrl() {
    return "https://storage.example.com";
  }

  getUrlForKey(key: string) {
    return `https://storage.example.com/${key}`;
  }

  async getSignedUrl() {
    return "https://storage.example.com/signed";
  }

  async store({
    body,
    contentType,
    key,
    acl,
  }: {
    body: Buffer;
    contentType?: string;
    key: string;
    acl?: string;
  }) {
    this.storedFiles.push({
      key,
      body: body as Buffer,
      contentType,
      acl,
    });
    return this.getUrlForKey(key);
  }

  async getFileHandle() {
    return { path: "/tmp/test", cleanup: async () => {} };
  }

  async getFileExists() {
    return false;
  }

  async moveFile() {}

  async deleteFile() {}

  static signingDateFor(expiresIn: number) {
    return MockStorage.getSigningDate(expiresIn);
  }
}

describe("BaseStorage", () => {
  describe("getSigningDate", () => {
    // A time deliberately offset from a window boundary, so that rounding is
    // exercised and two calls cannot straddle a boundary.
    const now = new Date("2026-04-16T12:07:31.500Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return the same date for calls within a window", () => {
      const first = MockStorage.signingDateFor(Hour.seconds);
      vi.setSystemTime(new Date("2026-04-16T12:08:01.500Z"));
      const second = MockStorage.signingDateFor(Hour.seconds);
      expect(second.getTime()).toBe(first.getTime());
    });

    it("should round down to the start of the window", () => {
      // The window is capped at 15 minutes, so 12:07:31.500 rounds to 12:00.
      const signingDate = MockStorage.signingDateFor(Hour.seconds);
      expect(signingDate.toISOString()).toBe("2026-04-16T12:00:00.000Z");
    });

    it("should move to the next window once the boundary passes", () => {
      const first = MockStorage.signingDateFor(Hour.seconds);
      vi.setSystemTime(new Date("2026-04-16T12:22:31.500Z"));
      const second = MockStorage.signingDateFor(Hour.seconds);
      expect(second.getTime()).toBeGreaterThan(first.getTime());
    });

    it("should align to a window no longer than half the lifetime", () => {
      // The lifetime is shorter than the cap, so the window halves to 5
      // minutes and 12:07:31.500 rounds to 12:05.
      const expiresIn = 10 * Minute.seconds;
      const signingDate = MockStorage.signingDateFor(expiresIn);
      const elapsed = now.getTime() - signingDate.getTime();

      expect(signingDate.toISOString()).toBe("2026-04-16T12:05:00.000Z");
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThanOrEqual((expiresIn / 2) * 1000);
    });

    it("should cap the window so long lifetimes stay predictable", () => {
      const signingDate = MockStorage.signingDateFor(Week.seconds);
      const elapsed = now.getTime() - signingDate.getTime();
      expect(elapsed).toBeLessThanOrEqual(BaseStorage.maxSigningWindow * 1000);
    });

    it("should not align a lifetime too short to divide", () => {
      const signingDate = MockStorage.signingDateFor(1);
      expect(signingDate.getTime()).toBe(now.getTime());
    });
  });

  describe("getPresignedPut", () => {
    it("should return undefined from default implementation", async () => {
      const storage = new MockStorage();
      const result = await storage.getPresignedPut(
        "uploads/test/key",
        "private",
        1000000,
        "image/png"
      );
      expect(result).toBeUndefined();
    });
  });

  describe("storeFromUrl", () => {
    let storage: MockStorage;

    beforeEach(() => {
      storage = new MockStorage();
      storage.storedFiles = [];
      env.FILE_STORAGE_UPLOAD_MAX_SIZE = 500;
    });

    describe("base64 URL size validation", () => {
      it("should enforce maxUploadSize option for base64 URLs", async () => {
        const largeDataSize = 1000;
        const maxUploadSize = 500;

        const largeBuffer = Buffer.alloc(largeDataSize, "a");
        const base64Data = largeBuffer.toString("base64");
        const base64Url = `data:image/png;base64,${base64Data}`;

        const result = await storage.storeFromUrl(
          base64Url,
          "test-key",
          "public-read",
          undefined,
          { maxUploadSize }
        );

        expect(result).toBeUndefined();
        expect(storage.storedFiles).toHaveLength(0);
      });

      it("should enforce FILE_STORAGE_UPLOAD_MAX_SIZE for base64 URLs", async () => {
        const largeDataSize = 1000; // Exceeds our test limit of 500

        const largeBuffer = Buffer.alloc(largeDataSize, "a");
        const base64Data = largeBuffer.toString("base64");
        const base64Url = `data:image/png;base64,${base64Data}`;

        const result = await storage.storeFromUrl(
          base64Url,
          "test-key",
          "public-read"
        );

        expect(result).toBeUndefined();
        expect(storage.storedFiles).toHaveLength(0);
      });

      it("should allow base64 URLs within size limits", async () => {
        const dataSize = 100;
        const maxUploadSize = 500;

        const buffer = Buffer.alloc(dataSize, "a");
        const base64Data = buffer.toString("base64");
        const base64Url = `data:image/png;base64,${base64Data}`;

        const result = await storage.storeFromUrl(
          base64Url,
          "test-key",
          "public-read",
          undefined,
          { maxUploadSize }
        );

        expect(result).toBeDefined();
        expect(result?.contentLength).toBe(dataSize);
        expect(result?.contentType).toBe("image/png");
        expect(storage.storedFiles).toHaveLength(1);
        expect(storage.storedFiles[0].body.byteLength).toBe(dataSize);
      });

      it("should use the minimum of maxUploadSize and FILE_STORAGE_UPLOAD_MAX_SIZE", async () => {
        // Create data that's larger than maxUploadSize but smaller than FILE_STORAGE_UPLOAD_MAX_SIZE
        const maxUploadSize = 200;
        const dataSize = 300;

        const buffer = Buffer.alloc(dataSize, "a");
        const base64Data = buffer.toString("base64");
        const base64Url = `data:image/png;base64,${base64Data}`;

        const result = await storage.storeFromUrl(
          base64Url,
          "test-key",
          "public-read",
          undefined,
          { maxUploadSize }
        );

        // Should be rejected because it exceeds maxUploadSize even though it's under FILE_STORAGE_UPLOAD_MAX_SIZE
        expect(result).toBeUndefined();
        expect(storage.storedFiles).toHaveLength(0);
      });

      it("should return undefined for empty base64 data", async () => {
        const base64Url = "data:image/png;base64,";

        const result = await storage.storeFromUrl(
          base64Url,
          "test-key",
          "public-read"
        );

        expect(result).toBeUndefined();
        expect(storage.storedFiles).toHaveLength(0);
      });
    });

    describe("internal URL handling", () => {
      it("should return undefined for URLs already on the storage provider", async () => {
        const result = await storage.storeFromUrl(
          "https://storage.example.com/existing-file.png",
          "test-key",
          "public-read"
        );

        expect(result).toBeUndefined();
        expect(storage.storedFiles).toHaveLength(0);
      });
    });
  });

  describe("getContentDisposition", () => {
    const storage = new MockStorage();

    it("should include the file name so browsers keep the extension", () => {
      expect(storage.getContentDisposition("text/plain", "config.yaml")).toBe(
        'attachment; filename="config.yaml"'
      );
    });

    it("should return inline for safe content types", () => {
      expect(storage.getContentDisposition("image/png", "photo.png")).toBe(
        'inline; filename="photo.png"'
      );
    });

    it("should omit the file name when not provided", () => {
      expect(storage.getContentDisposition("text/plain")).toBe("attachment");
      expect(storage.getContentDisposition("image/png")).toBe("inline");
    });

    it("should encode a latin-1 file name rather than send it raw", () => {
      expect(
        storage.getContentDisposition("application/zip", "Café-export.zip")
      ).toBe(
        "attachment; filename=\"Caf?-export.zip\"; filename*=UTF-8''Caf%C3%A9-export.zip"
      );
    });

    it("should encode a file name outside latin-1", () => {
      expect(storage.getContentDisposition("image/png", "日本語.png")).toBe(
        "inline; filename=\"???.png\"; filename*=UTF-8''%E6%97%A5%E6%9C%AC%E8%AA%9E.png"
      );
    });

    it("should only produce US-ASCII, whatever the file name", () => {
      const names = [
        "Zürich Team-export.markdown.zip",
        "naïve.pdf",
        "Ünicode ✨ 日本語.png",
        "plain.txt",
      ];

      for (const name of names) {
        const value = storage.getContentDisposition("application/zip", name);
        expect(value).toMatch(/^[\x20-\x7e]*$/);
      }
    });
  });

  describe("getContentDispositionType", () => {
    const storage = new MockStorage();

    it("should return attachment when content type is missing", () => {
      expect(storage.getContentDispositionType()).toBe("attachment");
    });

    it("should return inline for audio, video, and safe types", () => {
      expect(storage.getContentDispositionType("audio/mpeg")).toBe("inline");
      expect(storage.getContentDispositionType("video/mp4")).toBe("inline");
      expect(storage.getContentDispositionType("application/pdf")).toBe(
        "inline"
      );
    });

    it("should return attachment for other content types", () => {
      expect(storage.getContentDispositionType("image/svg+xml")).toBe(
        "attachment"
      );
      expect(storage.getContentDispositionType("text/plain")).toBe(
        "attachment"
      );
    });
  });
});
