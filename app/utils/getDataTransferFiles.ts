export default function getDataTransferFiles(
  event:
    | Event
    | React.FormEvent<HTMLInputElement>
    | React.DragEvent<HTMLElement>
): File[] {
  let dataTransferItemsList = [];

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'dataTransfer' does not exist on type 'Sy... Remove this comment to see the full error message
  if (event.dataTransfer) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dataTransfer' does not exist on type 'Sy... Remove this comment to see the full error message
    const dt = event.dataTransfer;

    if (dt.files && dt.files.length) {
      dataTransferItemsList = dt.files;
    } else if (dt.items && dt.items.length) {
      // During the drag even the dataTransfer.files is null
      // but Chrome implements some drag store, which is accesible via dataTransfer.items
      dataTransferItemsList = dt.items;
    }
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'files' does not exist on type 'EventTarg... Remove this comment to see the full error message
  } else if (event.target && event.target.files) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'files' does not exist on type 'EventTarg... Remove this comment to see the full error message
    dataTransferItemsList = event.target.files;
  }

  // Convert from DataTransferItemsList to the native Array
  return Array.prototype.slice.call(dataTransferItemsList);
}
