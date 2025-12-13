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
}

describe("BaseStorage", () => {
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
});
