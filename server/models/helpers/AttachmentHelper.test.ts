import { AttachmentPreset } from "@shared/types";
import env from "@server/env";
import AttachmentHelper from "./AttachmentHelper";

describe("AttachmentHelper", () => {
  describe("presetToAcl", () => {
    it("uses a private attachment ACL when S3 object ACLs are disabled", () => {
      const original = env.AWS_S3_ACL;
      env.AWS_S3_ACL = "";

      try {
        expect(
          AttachmentHelper.presetToAcl(AttachmentPreset.DocumentAttachment)
        ).toBe("private");
        expect(AttachmentHelper.presetToAcl(AttachmentPreset.Avatar)).toBe(
          "public-read"
        );
      } finally {
        env.AWS_S3_ACL = original;
      }
    });

    it("uses a configured attachment ACL", () => {
      const original = env.AWS_S3_ACL;
      env.AWS_S3_ACL = "public-read";

      try {
        expect(
          AttachmentHelper.presetToAcl(AttachmentPreset.DocumentAttachment)
        ).toBe("public-read");
      } finally {
        env.AWS_S3_ACL = original;
      }
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
