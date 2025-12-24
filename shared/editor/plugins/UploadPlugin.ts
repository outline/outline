import type { Node } from "prosemirror-model";
import { Fragment, Slice } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { v4 as uuidv4 } from "uuid";
import {
  getDataTransferFiles,
  getDataTransferImage,
  dataUrlToFile,
} from "../../utils/files";
import { fileNameFromUrl, isInternalUrl } from "../../utils/urls";
import type { Options } from "../commands/insertFiles";
import insertFiles from "../commands/insertFiles";
import FileHelper from "../lib/FileHelper";
import uploadPlaceholder, { findPlaceholder } from "../lib/uploadPlaceholder";

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
            id: string;
          }[] = [];

          const mapNode = (node: Node): Node => {
            if (
              node.type.name === "image" &&
              node.attrs.src &&
              !isInternalUrl(node.attrs.src)
            ) {
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

          // We need to wait for the pasted content to be inserted before we can
          // find the nodes and replace them with placeholders.
          setTimeout(() => {
            void Promise.all(
              uploads.map(async (upload) => {
                if (view.isDestroyed) {
                  return;
                }

                const { state } = view;
                let pos = -1;
                let nodeSize = 0;
                let attrs = {};
                let existingDimensions:
                  | { width?: number; height?: number }
                  | undefined;

                state.doc.nodesBetween(
                  0,
                  state.doc.nodeSize - 2,
                  (node, nodePos) => {
                    if (
                      node.type.name === "image" &&
                      node.attrs.src === upload.searchSrc
                    ) {
                      pos = nodePos;
                      nodeSize = node.nodeSize;
                      attrs = node.attrs;
                      if (node.attrs.width || node.attrs.height) {
                        existingDimensions = {
                          width: node.attrs.width,
                          height: node.attrs.height,
                        };
                      }
                      return false;
                    }
                    return true;
                  }
                );

                if (pos !== -1) {
                  const isBase64 = upload.originalSrc.startsWith("data:");
                  const file = isBase64
                    ? dataUrlToFile(upload.originalSrc, "pasted-image")
                    : undefined;
                  const dimensions =
                    (isBase64 && file
                      ? await FileHelper.getImageDimensions(file)
                      : undefined) ?? existingDimensions;

                  if (view.isDestroyed) {
                    return;
                  }

                  // The position may have changed while we were awaiting dimensions
                  let currentPos = -1;
                  view.state.doc.nodesBetween(
                    0,
                    view.state.doc.nodeSize - 2,
                    (node, nodePos) => {
                      if (
                        node.type.name === "image" &&
                        node.attrs.src === upload.searchSrc
                      ) {
                        currentPos = nodePos;
                        return false;
                      }
                      return true;
                    }
                  );

                  if (currentPos !== -1) {
                    view.dispatch(
                      view.state.tr
                        .setMeta(uploadPlaceholder, {
                          add: {
                            id: upload.id,
                            file,
                            src: isBase64 ? undefined : upload.originalSrc,
                            pos: currentPos,
                            isImage: true,
                            dimensions,
                          },
                        })
                        .delete(currentPos, currentPos + nodeSize)
                    );
                  }
                }

                const url = await options.uploadFile?.(upload.originalSrc, {
                  id: upload.id,
                });

                if (view.isDestroyed) {
                  return;
                }

                if (url) {
                  const file = await FileHelper.getFileForUrl(url);
                  const dimensions = await FileHelper.getImageDimensions(file);
                  const result = findPlaceholder(view.state, upload.id);

                  if (result) {
                    const [from, to] = result;
                    view.dispatch(
                      view.state.tr
                        .replaceWith(
                          from,
                          to || from,
                          view.state.schema.nodes.image.create({
                            ...attrs,
                            ...dimensions,
                            src: url,
                          })
                        )
                        .setMeta(uploadPlaceholder, {
                          remove: { id: upload.id },
                        })
                    );
                  }
                }
              })
            );
          }, 0);

          return new Slice(newContent, slice.openStart, slice.openEnd);
        },
      },
    });
  }
}
