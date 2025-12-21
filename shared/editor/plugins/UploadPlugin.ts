import type { Node} from "prosemirror-model";
import { Fragment, Slice } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { v4 as uuidv4 } from "uuid";
import { getDataTransferFiles, getDataTransferImage } from "../../utils/files";
import { fileNameFromUrl, isInternalUrl } from "../../utils/urls";
import type { Options } from "../commands/insertFiles";
import insertFiles from "../commands/insertFiles";
import FileHelper from "../lib/FileHelper";

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

                  void insertFiles(
                    view,
                    event,
                    result.pos,
                    [
                      new File([blob], fileName, {
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
        transformPasted: (slice, view) => {
          const uploads: {
            originalSrc: string;
            searchSrc: string;
            id?: string;
          }[] = [];

          const mapNode = (node: Node): Node => {
            if (
              node.type.name === "image" &&
              node.attrs.src &&
              !isInternalUrl(node.attrs.src)
            ) {
              const isBase64 = node.attrs.src.startsWith("data:");
              if (isBase64) {
                const id = uuidv4();
                const redirectUrl = `/api/attachments.redirect?id=${id}`;
                uploads.push({
                  originalSrc: node.attrs.src,
                  searchSrc: redirectUrl,
                  id,
                });
                return node.type.create({
                  ...node.attrs,
                  src: redirectUrl,
                });
              } else {
                uploads.push({
                  originalSrc: node.attrs.src,
                  searchSrc: node.attrs.src,
                });
              }
            }

            if (node.content.size > 0) {
              const nodes: Node[] = [];
              node.content.forEach((child) => {
                nodes.push(mapNode(child));
              });
              return node.copy(Fragment.from(nodes));
            }

            return node;
          };

          const nodes: Node[] = [];
          slice.content.forEach((node) => {
            nodes.push(mapNode(node));
          });
          const newContent = Fragment.from(nodes);

          // Upload each captured image in the background
          void uploads.map(async (upload) => {
            const url = await options.uploadFile?.(upload.originalSrc, {
              id: upload.id,
            });

            if (url) {
              const file = await FileHelper.getFileForUrl(url);
              const dimensions = await FileHelper.getImageDimensions(file);
              const { tr } = view.state;

              tr.doc.nodesBetween(0, tr.doc.nodeSize - 2, (node, pos) => {
                if (
                  node.type.name === "image" &&
                  node.attrs.src === upload.searchSrc
                ) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    ...dimensions,
                    src: url,
                  });
                }
              });

              view.dispatch(tr);
            }
          });

          return new Slice(newContent, slice.openStart, slice.openEnd);
        },
      },
    });
  }
}
