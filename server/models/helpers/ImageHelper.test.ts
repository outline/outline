import { ImageHelper } from "./ImageHelper";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

describe("ImageHelper", () => {
  describe("detectType", () => {
    it("should detect raster images from their leading bytes", () => {
      expect(ImageHelper.detectType(png)?.contentType).toBe("image/png");
      expect(
        ImageHelper.detectType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))
          ?.contentType
      ).toBe("image/jpeg");
      expect(
        ImageHelper.detectType(Buffer.from("GIF89a..."))?.contentType
      ).toBe("image/gif");
      expect(
        ImageHelper.detectType(
          Buffer.from("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ")
        )?.contentType
      ).toBe("image/webp");
    });

    it("should not detect SVG or HTML", () => {
      expect(
        ImageHelper.detectType(
          Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
        )
      ).toBeUndefined();
      expect(
        ImageHelper.detectType(
          Buffer.from("<html><script>alert(1)</script></html>")
        )
      ).toBeUndefined();
    });

    it("should not detect an empty or truncated buffer", () => {
      expect(ImageHelper.detectType(Buffer.alloc(0))).toBeUndefined();
      expect(ImageHelper.detectType(png.subarray(0, 4))).toBeUndefined();
    });
  });
});
