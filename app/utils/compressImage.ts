import Compressor from "compressorjs";

type Options = {
  maxWidth?: number;
  maxHeight?: number;
};

export const compressImage = async (
  file: File | Blob,
  options?: Options
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    new Compressor(file, { ...options, success: resolve, error: reject });
  });
