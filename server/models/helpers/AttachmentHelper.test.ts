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

    it("should return the correct key for an avatar attachment", () => {
      const key = AttachmentHelper.getKey({
        id: "123",
        name: "avatar.png",
        userId: "456",
        preset: AttachmentPreset.Avatar,
      });

      expect(key).toEqual("avatars/456/123/avatar.png");
    });

    it("should return uploads key for non-avatar presets", () => {
      const key = AttachmentHelper.getKey({
        id: "123",
        name: "doc.pdf",
        userId: "456",
        preset: AttachmentPreset.DocumentAttachment,
      });

      expect(key).toEqual("uploads/456/123/doc.pdf");
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
