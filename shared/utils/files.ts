/**
 * Converts bytes to human readable string for display
 *
 * @param bytes filesize in bytes
 * @returns Human readable filesize as a string
 */
export function bytesToHumanReadable(bytes: number | undefined) {
  if (!bytes) {
    return "0 Bytes";
  }

  const out = ("0".repeat((bytes.toString().length * 2) % 3) + bytes).match(
    /.{3}/g
  );

  if (!out || bytes < 1000) {
    return bytes + " Bytes";
  }

  const f = (out[1] ?? "").substring(0, 2);

  return `${Number(out[0])}${f === "00" ? "" : `.${f}`} ${
    "  kMGTPEZY"[out.length]
  }B`;
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
    return untrustedHTML
      ? new DOMParser()
          .parseFromString(untrustedHTML, "text/html")
          .querySelector("img")?.src
      : dt?.getData("url");
  } catch (e) {
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
  } catch (error) {
    return null;
  }
}
