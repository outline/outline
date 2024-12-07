import { extension } from "mime-types";
import { Plugin } from "prosemirror-state";
import { getDataTransferFiles, getDataTransferImage } from "../../utils/files";
import { fileNameFromUrl, isInternalUrl } from "../../utils/urls";
import insertFiles, { Options } from "../commands/insertFiles";

export class UploadPlugin extends Plugin {
  constructor(options: Options) {
    super({
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
            const files = getDataTransferFiles(event);
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
            if (html.length && !getDataTransferImage(event)) {
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

            // grab the position in the document for the cursor
            const result = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (!result) {
              return false;
            }

            const files = getDataTransferFiles(event);
            if (files.length) {
              void insertFiles(view, event, result.pos, files, options);
              return true;
            }

            const imageSrc = getDataTransferImage(event);
            if (imageSrc && !isInternalUrl(imageSrc)) {
              event.stopPropagation();
              event.preventDefault();

              void fetch(imageSrc)
                .then((response) => response.blob())
                .then((blob) => {
                  const fileName = fileNameFromUrl(imageSrc) ?? "pasted-image";
                  const ext = extension(blob.type) ?? "png";
                  const name = fileName.endsWith(`.${ext}`)
                    ? fileName
                    : `${fileName}.${ext}`;

                  void insertFiles(
                    view,
                    event,
                    result.pos,
                    [
                      new File([blob], name, {
                        type: blob.type,
                      }),
                    ],
                    options
                  );
                });
            }

            return false;
          },
        },
      },
    });
  }
}
