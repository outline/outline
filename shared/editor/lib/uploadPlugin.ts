import { Plugin } from "prosemirror-state";
import { getDataTransferFiles } from "../../utils/files";
import insertFiles, { Options } from "../commands/insertFiles";

const uploadPlugin = (options: Options) =>
  new Plugin({
    props: {
      handleDOMEvents: {
        paste(view, event: ClipboardEvent): boolean {
          if (!view.editable || !options.uploadFile) {
            return false;
          }

          if (!event.clipboardData) {
            return false;
          }

          // check if we actually pasted any files
          const files = Array.prototype.slice
            .call(event.clipboardData.items)
            .filter((dt: DataTransferItem) => dt.kind !== "string")
            .map((dt: DataTransferItem) => dt.getAsFile())
            .filter(Boolean);

          if (files.length === 0) {
            return false;
          }

          // When copying from Microsoft Office product the clipboard contains
          // an image version of the content, check if there is also text and
          // use that instead in this scenario.
          const html = event.clipboardData.getData("text/html");

          // Fallback to default paste behavior if the clipboard contains HTML
          // Even if there is an image, it's likely to be a screenshot from eg
          // Microsoft Suite / Apple Numbers – and not the original content.
          if (html.length && !html.includes("<img")) {
            return false;
          }

          const { tr } = view.state;
          if (!tr.selection.empty) {
            tr.deleteSelection();
          }
          const pos = tr.selection.from;

          void insertFiles(view, event, pos, files, options);
          return true;
        },
        drop(view, event: DragEvent): boolean {
          if (!view.editable || !options.uploadFile) {
            return false;
          }

          // filter to only include image files
          const files = getDataTransferFiles(event);
          if (files.length === 0) {
            return false;
          }

          // grab the position in the document for the cursor
          const result = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });

          if (result) {
            void insertFiles(view, event, result.pos, files, options);
            return true;
          }

          return false;
        },
      },
    },
  });

export default uploadPlugin;
