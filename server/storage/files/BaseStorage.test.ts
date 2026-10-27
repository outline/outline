import { createServer } from "node:http";
import type { Readable } from "node:stream";
import { buffer } from "node:stream/consumers";
import { http, HttpResponse } from "msw";
import { Hour, Minute, Week } from "@shared/utils/time";
import BaseStorage from "./BaseStorage";
import env from "@server/env";
import { server } from "@server/test/msw";

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
    body: Buffer | Readable;
    contentType?: string;
    key: string;
    acl?: string;
  }) {
    this.storedFiles.push({
      key,
      body: Buffer.isBuffer(body) ? body : await buffer(body),
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

  public deletedKeys: string[] = [];

  async deleteFile(key: string) {
    this.deletedKeys.push(key);
  }

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

  describe("getSignedUrlMinimumLifetime", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return half of the default lifetime", () => {
      expect(BaseStorage.getSignedUrlMinimumLifetime()).toBe(
        BaseStorage.defaultSignedUrlExpires / 2
      );
    });

    it("should subtract the capped window from long lifetimes", () => {
      expect(BaseStorage.getSignedUrlMinimumLifetime(Hour.seconds)).toBe(
        Hour.seconds - BaseStorage.maxSigningWindow
      );
    });

    it("should return the full lifetime when it is too short to align", () => {
      expect(BaseStorage.getSignedUrlMinimumLifetime(1)).toBe(1);
    });

    it("should not exceed the remaining lifetime at the end of a window", () => {
      const expiresIn = BaseStorage.defaultSignedUrlExpires;
      const now = new Date("2026-04-16T12:07:29.999Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const expiresAt =
        MockStorage.signingDateFor(expiresIn).getTime() + expiresIn * 1000;
      const remaining = (expiresAt - now.getTime()) / 1000;

      expect(
        BaseStorage.getSignedUrlMinimumLifetime(expiresIn)
      ).toBeLessThanOrEqual(remaining);
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

    const originalMaxSize = env.FILE_STORAGE_UPLOAD_MAX_SIZE;

    beforeEach(() => {
      storage = new MockStorage();
      storage.storedFiles = [];
      env.FILE_STORAGE_UPLOAD_MAX_SIZE = 500;
    });

    afterEach(() => {
      env.FILE_STORAGE_UPLOAD_MAX_SIZE = originalMaxSize;
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

    describe("imagesOnly", () => {
      it("should store a supported image with the detected content type", async () => {
        const gif = Buffer.from("GIF89a...").toString("base64");

        const result = await storage.storeFromUrl(
          `data:image/png;base64,${gif}`,
          "test-key",
          "public-read",
          undefined,
          { imagesOnly: true }
        );

        expect(result?.contentType).toBe("image/gif");
        expect(storage.storedFiles).toHaveLength(1);
        expect(storage.storedFiles[0].contentType).toBe("image/gif");
      });

      it("should not store an SVG", async () => {
        const svg = Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
        ).toString("base64");

        const result = await storage.storeFromUrl(
          `data:image/png;base64,${svg}`,
          "test-key",
          "public-read",
          undefined,
          { imagesOnly: true }
        );

        expect(result).toBeUndefined();
        expect(storage.storedFiles).toHaveLength(0);
      });
    });

    describe("remote URLs", () => {
      const remoteUrl = "https://files.example.com/file.bin";

      /**
       * Responds to the remote URL with a body that is streamed in chunks and
       * has no Content-Length header.
       *
       * @param chunks The chunks of the body.
       * @param contentType The content type of the response.
       */
      const respondWithChunks = (chunks: Buffer[], contentType: string) =>
        server.use(
          http.get(
            remoteUrl,
            () =>
              new HttpResponse(
                new ReadableStream({
                  start(controller) {
                    chunks.forEach((chunk) => controller.enqueue(chunk));
                    controller.close();
                  },
                }),
                { headers: { "Content-Type": contentType } }
              )
          )
        );

      it("should stream the file to storage", async () => {
        respondWithChunks(
          [Buffer.alloc(100, "a"), Buffer.alloc(150, "b")],
          "application/pdf"
        );

        const result = await storage.storeFromUrl(
          remoteUrl,
          "test-key",
          "private"
        );

        expect(result?.contentLength).toBe(250);
        expect(result?.contentType).toBe("application/pdf");
        expect(storage.storedFiles).toHaveLength(1);
        expect(storage.storedFiles[0].body.byteLength).toBe(250);
      });

      it("should not store a file that exceeds the size limit while streaming", async () => {
        respondWithChunks(
          [Buffer.alloc(400, "a"), Buffer.alloc(400, "b")],
          "application/pdf"
        );

        const result = await storage.storeFromUrl(
          remoteUrl,
          "test-key",
          "private"
        );

        expect(result).toBeUndefined();
        expect(storage.deletedKeys).toEqual(["test-key"]);
      });

      it("should not download a file with a Content-Length over the size limit", async () => {
        server.use(
          http.get(
            remoteUrl,
            () =>
              new HttpResponse(Buffer.alloc(800, "a"), {
                headers: { "Content-Length": "800" },
              })
          )
        );

        const result = await storage.storeFromUrl(
          remoteUrl,
          "test-key",
          "private"
        );

        expect(result).toBeUndefined();
        expect(storage.storedFiles).toHaveLength(0);
      });

      it("should close the connection when the Content-Length is over the size limit", async () => {
        // A real server is used, as the mocked responses do not report when
        // the connection is closed.
        let handleClose = () => {};
        const closed = new Promise<void>((resolve) => {
          handleClose = resolve;
        });
        const remote = createServer((_req, res) => {
          res.on("close", handleClose);
          res.writeHead(200, { "Content-Length": "800" });
          res.write(Buffer.alloc(100, "a"));
        });
        await new Promise<void>((resolve) =>
          remote.listen(0, "127.0.0.1", resolve)
        );
        const address = remote.address();
        if (!address || typeof address === "string") {
          throw new Error("Server is not listening on a port");
        }
        const allowed = env.ALLOWED_PRIVATE_IP_ADDRESSES;
        env.ALLOWED_PRIVATE_IP_ADDRESSES = ["127.0.0.1"];

        try {
          const result = await storage.storeFromUrl(
            `http://127.0.0.1:${address.port}/file.bin`,
            "test-key",
            "private"
          );

          expect(result).toBeUndefined();
          await expect(
            Promise.race([
              closed.then(() => "closed"),
              new Promise((resolve) => setTimeout(resolve, 1000, "open")),
            ])
          ).resolves.toBe("closed");
        } finally {
          env.ALLOWED_PRIVATE_IP_ADDRESSES = allowed;
          remote.closeAllConnections();
          remote.close();
        }
      });

      it("should not store an empty file", async () => {
        respondWithChunks([], "application/pdf");

        const result = await storage.storeFromUrl(
          remoteUrl,
          "test-key",
          "private"
        );

        expect(result).toBeUndefined();
        expect(storage.storedFiles).toHaveLength(0);
      });

      it("should detect an image from leading bytes split across chunks", async () => {
        const png = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
        ]);
        respondWithChunks(
          [png.subarray(0, 3), png.subarray(3), Buffer.alloc(20)],
          "text/html"
        );

        const result = await storage.storeFromUrl(
          remoteUrl,
          "test-key",
          "public-read",
          undefined,
          { imagesOnly: true }
        );

        expect(result?.contentType).toBe("image/png");
        expect(result?.contentLength).toBe(30);
        expect(storage.storedFiles[0].body.byteLength).toBe(30);
      });

      it("should not store a remote file that is not an image", async () => {
        respondWithChunks([Buffer.from("<html></html>")], "image/png");

        const result = await storage.storeFromUrl(
          remoteUrl,
          "test-key",
          "public-read",
          undefined,
          { imagesOnly: true }
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
