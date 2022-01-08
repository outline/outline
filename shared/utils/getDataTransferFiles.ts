export default function getDataTransferFiles(
  event:
    | Event
    | React.FormEvent<HTMLInputElement>
    | React.DragEvent<HTMLElement>
): File[] {
  let dataTransferItemsList!: FileList | DataTransferItemList;

  if ("dataTransfer" in event) {
    const dt = event.dataTransfer;

    if (dt.files && dt.files.length) {
      dataTransferItemsList = dt.files;
    } else if (dt.items && dt.items.length) {
      // During the drag even the dataTransfer.files is null
      // but Chrome implements some drag store, which is accesible via dataTransfer.items
      dataTransferItemsList = dt.items;
    }
  } else if (event.target && "files" in event.target) {
    // @ts-expect-error fallback
    dataTransferItemsList = event.target.files;
  }

  // Convert from DataTransferItemsList to the native Array
  return dataTransferItemsList
    ? Array.prototype.slice.call(dataTransferItemsList)
    : [];
}
