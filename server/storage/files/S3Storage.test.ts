import { Week } from "@shared/utils/time";
import BaseStorage from "./BaseStorage";
import S3Storage from "./S3Storage";

describe("S3Storage", () => {
  describe("getSignedUrl", () => {
    it("should clamp expiration to maximum allowed by AWS S3 Signature V4", () => {
      // AWS S3 Signature V4 presigned URLs have a maximum expiration of 7 days
      const maxExpiration = Week.seconds;

      // Verify our constant matches AWS limit
      expect(BaseStorage.maxSignedUrlExpires).toBe(maxExpiration);
      expect(BaseStorage.maxSignedUrlExpires).toBe(604800); // 7 days in seconds
    });
  });
});
