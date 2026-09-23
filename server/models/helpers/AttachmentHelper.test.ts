import { AttachmentPreset } from "@shared/types";
import env from "@server/env";
import AttachmentHelper from "./AttachmentHelper";

describe("AttachmentHelper", () => {
  describe("presetToAcl", () => {
    const originalAcl = env.AWS_S3_ACL;

    afterEach(() => {
      env.AWS_S3_ACL = originalAcl;
    });

    it("uses a private attachment ACL when provider object ACLs are disabled", () => {
      env.AWS_S3_ACL = "";

      expect(
        AttachmentHelper.presetToAcl(AttachmentPreset.DocumentAttachment)
      ).toBe("private");
      expect(AttachmentHelper.presetToAcl(AttachmentPreset.Avatar)).toBe(
        "public-read"
      );
    });

    it("preserves an explicitly configured attachment ACL", () => {
      env.AWS_S3_ACL = "public-read";

      expect(
        AttachmentHelper.presetToAcl(AttachmentPreset.DocumentAttachment)
      ).toBe("public-read");
    });
  });

  describe("getKey", () => {
    it("should return the correct key for a private attachment", () => {
      const key = AttachmentHelper.getKey({
        id: "123",
        name: "test.png",
        userId: "456",
      });

      expect(key).toEqual("uploads/456/123/test.png");
    });

    it("should return the correct key for a long file name", () => {
      const key = AttachmentHelper.getKey({
        id: "123",
        name: "a".repeat(300),
        userId: "456",
      });

      expect(key).toEqual(
        `uploads/456/123/${"a".repeat(AttachmentHelper.maximumFileNameLength)}`
      );
    });

    it("should remove invalid characters from the key", () => {
      const key = AttachmentHelper.getKey({
        id: "123",
        name: "test/../one.png",
        userId: "456",
      });

      expect(key).toEqual("uploads/456/123/test/one.png");
    });
  });
});
