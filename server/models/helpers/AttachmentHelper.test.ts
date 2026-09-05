import { AttachmentPreset } from "@shared/types";
import AttachmentHelper from "./AttachmentHelper";

describe("AttachmentHelper", () => {
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

  describe("presetToAcl", () => {
    it("keeps document attachments private while avatars remain public", () => {
      expect(
        AttachmentHelper.presetToAcl(AttachmentPreset.DocumentAttachment)
      ).toBe("private");
      expect(AttachmentHelper.presetToAcl(AttachmentPreset.Avatar)).toBe(
        "public-read"
      );
    });
  });
});
