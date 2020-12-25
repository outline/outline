// @flow
import Compressor from "compressorjs";

type Options = Omit<Compressor.Options, "success" | "error">;

export const compressImage = async (
  file: File | Blob,
  options?: Options
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      ...options,
      success: resolve,
      error: reject,
    });
  });
};
