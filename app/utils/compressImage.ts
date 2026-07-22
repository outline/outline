import Compressor from "compressorjs";

type Options = {
  maxWidth?: number;
  maxHeight?: number;
};

/**
 * Compresses an image file or blob, optionally constraining its dimensions.
 *
 * @param file the image file or blob to compress.
 * @param options optional maximum width and height constraints.
 * @returns a promise resolving to the compressed image blob.
 */
export const compressImage = async (
  file: File | Blob,
  options?: Options
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    new Compressor(file, { ...options, success: resolve, error: reject });
  });
