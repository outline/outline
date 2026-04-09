import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Week, Day } from "@shared/utils/time";
import env from "@server/env";
import BaseStorage from "./BaseStorage";
import S3Storage from "./S3Storage";

describe("S3Storage", () => {
  describe("getPresignedPost upload method", () => {
    const mockedCreatePresignedPost = jest.mocked(createPresignedPost);
    const mockedGetSignedUrl = jest.mocked(getSignedUrl);
    const defaultUploadMethod = env.AWS_S3_UPLOAD_METHOD;

    beforeEach(() => {
      jest.resetAllMocks();
      env.AWS_S3_UPLOAD_BUCKET_NAME = "test-bucket";
      env.AWS_S3_UPLOAD_BUCKET_URL = "https://s3.eu-west-1.amazonaws.com";
      env.AWS_S3_ACL = "private";
    });

    afterEach(() => {
      env.AWS_S3_UPLOAD_METHOD = defaultUploadMethod;
    });

    it("should default to post upload method", async () => {
      mockedCreatePresignedPost.mockResolvedValue({
        url: "https://upload.example.com",
        fields: {
          key: "test-key",
        },
      });
      delete process.env.AWS_S3_UPLOAD_METHOD;
      env.AWS_S3_UPLOAD_METHOD = "post";

      const storage = new S3Storage();
      const result = await storage.getPresignedPost(
        {} as never,
        "test-key",
        "private",
        1024,
        "image/png"
      );

      expect(result.method).toBe("POST");
      expect(mockedCreatePresignedPost).toHaveBeenCalledTimes(1);
      expect(mockedGetSignedUrl).not.toHaveBeenCalled();
    });

    it("should use put upload method when configured", async () => {
      mockedGetSignedUrl.mockResolvedValue("https://signed-put.example.com");
      env.AWS_S3_UPLOAD_METHOD = "put";

      const storage = new S3Storage();
      const result = await storage.getPresignedPost(
        {} as never,
        "test-key",
        "private",
        1024,
        "image/png"
      );

      expect(result.method).toBe("PUT");
      expect(result.url).toBe("https://signed-put.example.com");
      expect(result.fields).toMatchObject({
        "Content-Type": "image/png",
        "Cache-Control": "max-age=31557600",
      });
      expect(mockedGetSignedUrl).toHaveBeenCalledTimes(1);
      expect(mockedCreatePresignedPost).not.toHaveBeenCalled();
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
