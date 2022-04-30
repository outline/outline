/**
 * Converts bytes to human readable string for display
 *
 * @param bytes filesize in bytes
 * @returns Human readable filesize as a string
 */
export const bytesToHumanReadable = (bytes: number) => {
  const out = ("0".repeat((bytes.toString().length * 2) % 3) + bytes).match(
    /.{3}/g
  );

  if (!out || bytes < 1000) {
    return bytes + " Bytes";
  }

  const f = out[1].substring(0, 2);

  return `${Number(out[0])}${f === "00" ? "" : `.${f}`} ${
    "  kMGTPEZY"[out.length]
  }B`;
};

/**
 * An array of image mimetypes commonly supported by modern browsers
 */
export const supportedImageMimeTypes = [
  "image/jpg",
  "image/jpeg",
  "image/pjpeg",
  "image/png",
  "image/apng",
  "image/avif",
  "image/gif",
  "image/webp",
  "image/svg",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
];
