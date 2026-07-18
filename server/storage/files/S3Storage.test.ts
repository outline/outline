import { vi } from "vitest";
import { Week, Day } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import BaseStorage from "./BaseStorage";
import S3Storage from "./S3Storage";

describe("S3Storage", () => {
  describe("getFileStream", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns null and does not report an error when the object is missing (masked 403)", async () => {
      // S3 returns AccessDenied for s3:ListBucket instead of 404 when the IAM
      // identity lacks ListBucket permission and the key does not exist.
      const error = Object.assign(
        new Error(
          "User: arn:aws:iam::123:user/attachments is not authorized to perform: s3:ListBucket on resource"
        ),
        {
          name: "AccessDenied",
          $metadata: { httpStatusCode: 403 },
        }
      );
      const storage = new S3Storage();
      vi.spyOn(Reflect.get(storage, "client"), "send").mockRejectedValue(error);
      const errorSpy = vi.spyOn(Logger, "error");
      const infoSpy = vi.spyOn(Logger, "info");

      const stream = await storage.getFileStream("missing/key");

      expect(stream).toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
    });

    it("reports a real error for unexpected failures", async () => {
      const error = Object.assign(new Error("boom"), {
        name: "InternalError",
        $metadata: { httpStatusCode: 500 },
      });
      const storage = new S3Storage();
      vi.spyOn(Reflect.get(storage, "client"), "send").mockRejectedValue(error);
      const errorSpy = vi.spyOn(Logger, "error");

      const stream = await storage.getFileStream("some/key");

      expect(stream).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("getSignedUrl expiration limits", () => {
    it("should define maximum expiration as 7 days for AWS S3 Signature V4", () => {
      // AWS S3 Signature V4 presigned URLs have a maximum expiration of 7 days
      const maxExpiration = Week.seconds;

      // Verify our constant matches AWS limit
      expect(BaseStorage.maxSignedUrlExpires).toBe(maxExpiration);
      expect(BaseStorage.maxSignedUrlExpires).toBe(604800); // 7 days in seconds
    });

    it("should have Week.seconds equal to 7 days", () => {
      expect(Week.seconds).toBe(7 * 24 * 60 * 60);
      expect(Week.seconds).toBe(604800);
    });

    it("should ensure 30 days exceeds the limit", () => {
      const thirtyDays = 30 * Day.seconds;
      expect(thirtyDays).toBeGreaterThan(BaseStorage.maxSignedUrlExpires);
      expect(thirtyDays).toBe(2592000); // 30 days in seconds
    });

    it("should ensure 4 days is within the limit", () => {
      const fourDays = 4 * Day.seconds;
      expect(fourDays).toBeLessThan(BaseStorage.maxSignedUrlExpires);
      expect(fourDays).toBe(345600); // 4 days in seconds
    });

    it("should clamp values that exceed the limit", () => {
      const thirtyDays = 30 * Day.seconds;
      const clampedValue = Math.min(
        thirtyDays,
        BaseStorage.maxSignedUrlExpires
      );

      expect(clampedValue).toBe(BaseStorage.maxSignedUrlExpires);
      expect(clampedValue).toBe(Week.seconds);
    });
  });
});
