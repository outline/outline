import Compressor from "compressorjs";

export class ImageHelper {
  /**
   * Checks whether a file is a HEIC or HEIF image. The extension is also
   * checked because some platforms report an empty mime-type for these files.
   *
   * @param file the file to check.
   * @returns true if the file is a HEIC or HEIF image.
   */
  public static isHeic(file: File): boolean {
    const contentTypes = [
      "image/heic",
      "image/heif",
      "image/heic-sequence",
      "image/heif-sequence",
    ];
    const extensions = [".heic", ".heif"];

    return (
      contentTypes.includes(file.type.toLowerCase()) ||
      extensions.some((extension) =>
        file.name.toLowerCase().endsWith(extension)
      )
    );
  }

  /**
   * Compresses an image file or blob, optionally constraining its dimensions.
   *
   * @param file the image file or blob to compress.
   * @param options optional compression options, the result is returned by the
   * promise rather than the success and error callbacks.
   * @returns a promise resolving to the compressed image blob.
   */
  public static compress(
    file: File | Blob,
    options?: Omit<Compressor.Options, "success" | "error">
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      new Compressor(file, { ...options, success: resolve, error: reject });
    });
  }

  /**
   * Converts a HEIC or HEIF image to a JPEG that all browsers can display. The
   * browser's own decoder is used when it supports the format, otherwise a
   * decoder is lazily downloaded.
   *
   * @param file the HEIC or HEIF file to convert.
   * @returns a promise resolving to the converted JPEG file.
   * @throws Error if the image cannot be decoded.
   */
  public static async convertHeicToJpeg(file: File): Promise<File> {
    const blob =
      (await this.decodeHeicNatively(file)) ??
      (await this.decodeHeicWithWasm(file));

    const name = `${file.name.replace(/\.(heic|heif)$/i, "")}.jpg`;

    return new File([blob], name, { type: "image/jpeg" });
  }

  private static jpegQuality = 0.92;

  /**
   * Decodes an image with the browser, which Safari is able to do for HEIC.
   *
   * @param file the file to decode.
   * @returns a promise resolving to a JPEG blob, or undefined if the browser
   * cannot decode the format.
   */
  private static async decodeHeicNatively(
    file: File
  ): Promise<Blob | undefined> {
    if (typeof createImageBitmap === "undefined") {
      return undefined;
    }

    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch (_err) {
      return undefined;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const context = canvas.getContext("2d");
      if (!context) {
        return undefined;
      }
      context.drawImage(bitmap, 0, 0);

      return await new Promise<Blob | undefined>((resolve) => {
        canvas.toBlob(
          (result) => resolve(result ?? undefined),
          "image/jpeg",
          this.jpegQuality
        );
      });
    } finally {
      bitmap.close();
    }
  }

  /**
   * Decodes a HEIC or HEIF image with a lazily downloaded WebAssembly decoder.
   *
   * @param file the file to decode.
   * @returns a promise resolving to a JPEG blob.
   * @throws Error if the image cannot be decoded.
   */
  private static async decodeHeicWithWasm(file: File): Promise<Blob> {
    // The "csp" build is used because the default build evaluates a string as
    // JavaScript, which the Content Security Policy does not permit.
    const { heicTo } = await import("heic-to/csp");
    return heicTo({
      blob: file,
      type: "image/jpeg",
      quality: this.jpegQuality,
    });
  }
}
