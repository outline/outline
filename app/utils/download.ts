/**
 * Triggers a browser download of the given data as a named file.
 *
 * @param data the file contents as a Blob, File, or string.
 * @param fileName the name to save the file as.
 * @param mimeType the mime type used when data is a string, defaults to application/octet-stream.
 */
export function download(
  data: Blob | File | string,
  fileName: string,
  mimeType = "application/octet-stream"
) {
  const blob =
    data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "download";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Delay revocation so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 250);
}
