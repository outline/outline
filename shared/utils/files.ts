import { inflate } from "pako";
import { isMac } from "./browser";
import { isUrl } from "./urls";

/**
 * Reads a PNG file (as ArrayBuffer) and detects if it contains embedded Draw.io data.
 * Returns { isDrawio, xml }.
 */
export async function getSourceFromFile(
  file: File
): Promise<string | undefined> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Validate PNG signature
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!pngSignature.every((b, i) => bytes[i] === b)) {
    return;
  }

  let pos = 8; // skip PNG header

  while (pos < bytes.length) {
    // Read chunk length and type
    const length =
      (bytes[pos] << 24) |
      (bytes[pos + 1] << 16) |
      (bytes[pos + 2] << 8) |
      bytes[pos + 3];
    const type = String.fromCharCode(...bytes.slice(pos + 4, pos + 8));
    const data = bytes.slice(pos + 8, pos + 8 + length);
    pos += 12 + length; // advance to next chunk

    // Check for text chunks where Draw.io embeds metadata
    if (type === "tEXt" || type === "zTXt" || type === "iTXt") {
      const nullIndex = data.indexOf(0);
      if (nullIndex < 0) {
        continue;
      }
      const keyword = new TextDecoder().decode(data.slice(0, nullIndex));

      if (keyword.includes("mxfile")) {
        try {
          let textContent: string;

          if (type === "tEXt") {
            // tEXt: keyword + null + uncompressed text
            textContent = new TextDecoder().decode(data.slice(nullIndex + 1));
          } else if (type === "zTXt") {
            // zTXt: keyword + null + compression method + compressed text
            const compressionMethod = data[nullIndex + 1];
            if (compressionMethod === 0) {
              // 0 = deflate compression
              const compressed = data.slice(nullIndex + 2);
              textContent = inflate(compressed, { to: "string" });
            } else {
              continue; // Unsupported compression method
            }
          } else {
            // iTXt
            // iTXt: keyword + null + compression flag + compression method + language tag + null + translated keyword + null + text
            const compressionFlag = data[nullIndex + 1];
            if (compressionFlag === 0) {
              // Uncompressed iTXt
              let pos = nullIndex + 3; // Skip null, compression flag, and compression method
              // Skip language tag
              while (pos < data.length && data[pos] !== 0) {
                pos++;
              }
              pos++; // Skip null after language tag
              // Skip translated keyword
              while (pos < data.length && data[pos] !== 0) {
                pos++;
              }
              pos++; // Skip null after translated keyword
              textContent = new TextDecoder().decode(data.slice(pos));
            } else if (compressionFlag === 1) {
              // Compressed iTXt
              let pos = nullIndex + 3; // Skip null, compression flag, and compression method
              // Skip language tag
              while (pos < data.length && data[pos] !== 0) {
                pos++;
              }
              pos++; // Skip null after language tag
              // Skip translated keyword
              while (pos < data.length && data[pos] !== 0) {
                pos++;
              }
              pos++; // Skip null after translated keyword
              const compressed = data.slice(pos);
              textContent = inflate(compressed, { to: "string" });
            } else {
              continue; // Invalid compression flag
            }
          }

          if (textContent.includes("%3Cmxfile")) {
            return "drawio";
          }
        } catch (_err) {
          // Ignore decompression errors and continue
        }
      }
    }
  }

  return;
}

/**
 * Converts bytes to human readable string for display
 * Uses binary units (1024-based) on Windows and decimal units (1000-based) on macOS
 *
 * @param bytes filesize in bytes
 * @returns Human readable filesize as a string
 */
export function bytesToHumanReadable(bytes: number | undefined) {
  if (!bytes) {
    return "0 Bytes";
  }

  // Use decimal units (base 1000) on macOS, binary units (base 1024) on other platforms
  const useMacUnits = isMac();
  const base = useMacUnits ? 1000 : 1024;
  const threshold = useMacUnits ? 1000 : 1024;

  if (bytes < threshold) {
    return bytes + " Bytes";
  }

  const units = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const exponent = Math.floor(Math.log(bytes) / Math.log(base));
  const value = bytes / Math.pow(base, exponent);

  // Format to 2 decimal places and remove trailing zeros
  const formatted = parseFloat(value.toFixed(2));

  return `${formatted} ${units[exponent]}`;
}

/**
 * Get an image URL from a drag or clipboard event
 *
 * @param event The event to get the image from.
 * @returns The URL of the image.
 */
export function getDataTransferImage(
  event: React.DragEvent<HTMLElement> | DragEvent | ClipboardEvent
) {
  const dt =
    event instanceof ClipboardEvent ? event.clipboardData : event.dataTransfer;
  const untrustedHTML = dt?.getData("text/html");

  try {
    const src = untrustedHTML
      ? new DOMParser()
          .parseFromString(untrustedHTML, "text/html")
          .querySelector("img")?.src
      : dt?.getData("url");

    // Validate URL to prevent XSS attacks
    if (src && typeof src === "string") {
      // Allow relative URLs starting with /
      if (src.startsWith("/")) {
        return src;
      }

      // Allow data URLs only for images
      if (src.toLowerCase().startsWith("data:image/")) {
        return src;
      }

      // For all other URLs, use isUrl which blocks dangerous protocols
      if (
        isUrl(src, {
          requireProtocol: false,
          requireHostname: false,
        })
      ) {
        return src;
      }
    }

    return;
  } catch (_err) {
    return;
  }
}

/**
 * Get an array of File objects from a drag or clipboard event
 *
 * @param event The event to get files from.
 * @returns An array of files.
 */
export function getDataTransferFiles(
  event: React.DragEvent<HTMLElement> | DragEvent | ClipboardEvent
): File[] {
  const dt =
    event instanceof ClipboardEvent ? event.clipboardData : event.dataTransfer;

  if (dt) {
    if ("files" in dt && dt.files.length) {
      return dt.files ? Array.prototype.slice.call(dt.files) : [];
    }

    if ("items" in dt && dt.items.length) {
      return dt.items
        ? Array.prototype.slice
            .call(dt.items)
            .filter((dti: DataTransferItem) => dti.kind !== "string")
            .map((dti: DataTransferItem) => dti.getAsFile())
            .filter(Boolean)
        : [];
    }
  }

  return [];
}

/**
 * Get an array of DataTransferItems from a drag event
 *
 * @param event The react or native drag event
 * @returns An array of DataTransferItems
 */
export function getDataTransferItems(
  event: React.DragEvent<HTMLElement> | DragEvent
): DataTransferItem[] {
  const dt = event.dataTransfer;

  if (dt) {
    if ("items" in dt && dt.items.length) {
      return dt.items ? Array.prototype.slice.call(dt.items) : [];
    }
  }

  return [];
}

/**
 * Get an array of Files from an input event
 *
 * @param event The react or native input event
 * @returns An array of Files
 */
export function getEventFiles(
  event: React.ChangeEvent<HTMLInputElement> | Event
): File[] {
  return event.target && "files" in event.target
    ? Array.prototype.slice.call(event.target.files)
    : [];
}

/**
 * Get the likely filename from a URL
 *
 * @param url The URL to get the filename from
 * @returns The filename or null if it could not be determined
 */
export function getFileNameFromUrl(url: string) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.substring(pathname.lastIndexOf("/") + 1);
    return filename;
  } catch (_err) {
    return null;
  }
}
