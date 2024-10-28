import AttachmentHelper from "./AttachmentHelper";

describe("AttachmentHelper", () => {
  describe("getKey", () => {
    it("should return the correct key for a public attachment", () => {
      const key = AttachmentHelper.getKey({
        acl: "public-read",
        id: "123",
        name: "test.png",
        userId: "456",
      });

      expect(key).toEqual("public/456/123/test.png");
    });

    it("should return the correct key for a private attachment", () => {
      const key = AttachmentHelper.getKey({
        acl: "private",
        id: "123",
        name: "test.png",
        userId: "456",
      });

      expect(key).toEqual("uploads/456/123/test.png");
    });

    it("should return the correct key for a long file name", () => {
      const key = AttachmentHelper.getKey({
        acl: "public-read",
        id: "123",
        name: "a".repeat(300),
        userId: "456",
      });

      expect(key).toEqual(
        `public/456/123/${"a".repeat(AttachmentHelper.maximumFileNameLength)}`
      );
    });

    it("should remove invalid characters from the key", () => {
      const key = AttachmentHelper.getKey({
        acl: "public-read",
        id: "123",
        name: "test/../one.png",
        userId: "456",
      });

      expect(key).toEqual("public/456/123/test/one.png");
    });
  });
});
