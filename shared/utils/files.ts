import { isMac } from "./browser";
import { isBase64Url, isUrl } from "./urls";

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
  const useMacUnits = isMac;
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

/**
 * Convert a data URL to a Blob
 *
 * @param dataURL The data URL to convert
 * @returns The Blob
 */
export const dataUrlToBlob = (dataURL: string): Blob => {
  const parts = dataURL.split(",");
  const match = dataURL.match(/:(.*?);/);
  const mime = match ? match[1] : "image/png";
  const blobBin = atob(parts[1]);
  const array = [];

  for (let i = 0; i < blobBin.length; i++) {
    array.push(blobBin.charCodeAt(i));
  }

  return new Blob([new Uint8Array(array)], {
    type: mime,
  });
};

/**
 * Convert a data URL to a File
 *
 * @param dataURL The data URL to convert
 * @param filename The filename to use
 * @returns The File
 */
export const dataUrlToFile = (dataURL: string, filename: string): File => {
  const match = isBase64Url(dataURL);
  const mime = match ? match[1] : "image/png";
  const blob = dataUrlToBlob(dataURL);
  return new File([blob], filename, { type: mime });
};
