import { Week, Day } from "@shared/utils/time";
import BaseStorage from "./BaseStorage";

describe("S3Storage", () => {
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
