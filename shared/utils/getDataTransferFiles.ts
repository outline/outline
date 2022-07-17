export default function getDataTransferFiles(
  event: React.DragEvent<HTMLElement> | DragEvent
): File[] {
  const dt = event.dataTransfer;

  if (dt) {
    if ("files" in dt && dt.files.length) {
      return dt.files ? Array.prototype.slice.call(dt.files) : [];
    }

    if ("items" in dt && dt.items.length) {
      return dt.items
        ? Array.prototype.slice
            .call(dt.items)
            .filter((dt: DataTransferItem) => dt.kind !== "string")
            .map((dt: DataTransferItem) => dt.getAsFile())
            .filter(Boolean)
        : [];
    }
  }

  return [];
}

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

export function getEventFiles(
  event: React.ChangeEvent<HTMLInputElement> | Event
): File[] {
  return event.target && "files" in event.target
    ? Array.prototype.slice.call(event.target.files)
    : [];
}
