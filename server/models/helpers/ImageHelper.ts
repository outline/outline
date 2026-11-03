/** A raster image type detected from file contents. */
export interface ImageType {
  /** The mime type of the image. */
  contentType: string;
  /** The file extension for the image, without a leading dot. */
  extension: string;
}

export class ImageHelper {
  /**
   * Detect a supported raster image from its leading bytes. A content type
   * sent by a remote host is not trusted, and SVG is never detected because it
   * can contain scripts.
   *
   * @param body the image data.
   * @returns the image type, or undefined if it is not a PNG, JPEG, GIF or WebP.
   */
  public static detectType(body: Buffer): ImageType | undefined {
    const startsWith = (bytes: number[]) =>
      bytes.every((byte, index) => body[index] === byte);

    if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      return { contentType: "image/png", extension: "png" };
    }
    if (startsWith([0xff, 0xd8, 0xff])) {
      return { contentType: "image/jpeg", extension: "jpg" };
    }
    if (/^GIF8[79]a$/.test(body.subarray(0, 6).toString("ascii"))) {
      return { contentType: "image/gif", extension: "gif" };
    }
    if (
      body.subarray(0, 4).toString("ascii") === "RIFF" &&
      body.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return { contentType: "image/webp", extension: "webp" };
    }
    return undefined;
  }
}
