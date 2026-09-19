import { ImageHelper } from "./ImageHelper";

const fileWith = (name: string, type: string) => new File([], name, { type });

describe("ImageHelper", () => {
  describe("isHeic", () => {
    it("matches HEIC and HEIF mime-types", () => {
      expect(ImageHelper.isHeic(fileWith("photo", "image/heic"))).toBe(true);
      expect(ImageHelper.isHeic(fileWith("photo", "image/heif"))).toBe(true);
      expect(ImageHelper.isHeic(fileWith("photo", "image/heic-sequence"))).toBe(
        true
      );
      expect(ImageHelper.isHeic(fileWith("photo", "IMAGE/HEIC"))).toBe(true);
    });

    it("matches by extension when the mime-type is missing", () => {
      expect(ImageHelper.isHeic(fileWith("photo.heic", ""))).toBe(true);
      expect(ImageHelper.isHeic(fileWith("photo.HEIF", ""))).toBe(true);
    });

    it("does not match other images", () => {
      expect(ImageHelper.isHeic(fileWith("photo.png", "image/png"))).toBe(
        false
      );
      expect(ImageHelper.isHeic(fileWith("photo.jpg", "image/jpeg"))).toBe(
        false
      );
      expect(ImageHelper.isHeic(fileWith("heic.png", "image/png"))).toBe(false);
    });
  });
});
