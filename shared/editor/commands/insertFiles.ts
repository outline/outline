import * as Sentry from "@sentry/react";
import { NodeSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { v4 as uuidv4 } from "uuid";
import uploadPlaceholderPlugin, {
  findPlaceholder,
} from "../lib/uploadPlaceholder";
import findAttachmentById from "../queries/findAttachmentById";

export type Options = {
  dictionary: any;
  /** Set to true to force images to become attachments */
  isAttachment?: boolean;
  /** Set to true to replace any existing image at the users selection */
  replaceExisting?: boolean;
  uploadFile?: (file: File) => Promise<string>;
  onFileUploadStart?: () => void;
  onFileUploadStop?: () => void;
  onShowToast: (message: string) => void;
};

const insertFiles = function (
  view: EditorView,
  event:
    | Event
    | React.ChangeEvent<HTMLInputElement>
    | React.DragEvent<HTMLDivElement>,
  pos: number,
  files: File[],
  options: Options
): void {
  const {
    dictionary,
    uploadFile,
    onFileUploadStart,
    onFileUploadStop,
    onShowToast,
  } = options;

  if (!uploadFile) {
    console.warn("uploadFile callback must be defined to handle uploads.");
    return;
  }

  // okay, we have some dropped files and a handler – lets stop this
  // event going any further up the stack
  event.preventDefault();

  // let the user know we're starting to process the files
  if (onFileUploadStart) {
    onFileUploadStart();
  }

  const { schema } = view.state;

  // we'll use this to track of how many files have succeeded or failed
  let complete = 0;

  // the user might have dropped multiple files at once, we need to loop
  for (const file of files) {
    const id = `upload-${uuidv4()}`;
    const isImage = file.type.startsWith("image/") && !options.isAttachment;
    const { tr } = view.state;

    if (isImage) {
      // insert a placeholder at this position, or mark an existing file as being
      // replaced
      tr.setMeta(uploadPlaceholderPlugin, {
        add: {
          id,
          file,
          pos,
          isImage,
          replaceExisting: options.replaceExisting,
        },
      });
      view.dispatch(tr);
    } else {
      const $pos = tr.doc.resolve(pos);
      view.dispatch(
        view.state.tr.replaceWith(
          $pos.pos,
          $pos.pos + ($pos.nodeAfter?.nodeSize || 0),
          schema.nodes.attachment.create({
            id,
            title: file.name ?? "Untitled",
            size: file.size,
          })
        )
      );
    }

    // start uploading the file to the server. Using "then" syntax
    // to allow all placeholders to be entered at once with the uploads
    // happening in the background in parallel.
    uploadFile(file)
      .then((src) => {
        if (isImage) {
          const newImg = new Image();
          newImg.onload = () => {
            const result = findPlaceholder(view.state, id);

            // if the content around the placeholder has been deleted
            // then forget about inserting this file
            if (result === null) {
              return;
            }

            const [from, to] = result;
            view.dispatch(
              view.state.tr
                .replaceWith(
                  from,
                  to || from,
                  schema.nodes.image.create({ src })
                )
                .setMeta(uploadPlaceholderPlugin, { remove: { id } })
            );

            // If the users selection is still at the file then make sure to select
            // the entire node once done. Otherwise, if the selection has moved
            // elsewhere then we don't want to modify it
            if (view.state.selection.from === from) {
              view.dispatch(
                view.state.tr.setSelection(
                  new NodeSelection(view.state.doc.resolve(from))
                )
              );
            }
          };

          newImg.onerror = (error) => {
            throw error;
          };

          newImg.src = src;
        } else {
          const result = findAttachmentById(view.state, id);

          // if the attachment has been deleted then forget about updating it
          if (result === null) {
            return;
          }

          const [from, to] = result;
          view.dispatch(
            view.state.tr.replaceWith(
              from,
              to || from,
              schema.nodes.attachment.create({
                href: src,
                title: file.name ?? "Untitled",
                size: file.size,
              })
            )
          );

          // If the users selection is still at the file then make sure to select
          // the entire node once done. Otherwise, if the selection has moved
          // elsewhere then we don't want to modify it
          if (view.state.selection.from === from) {
            view.dispatch(
              view.state.tr.setSelection(
                new NodeSelection(view.state.doc.resolve(from))
              )
            );
          }
        }
      })
      .catch((error) => {
        Sentry.captureException(error);

        // cleanup the placeholder if there is a failure
        if (isImage) {
          view.dispatch(
            view.state.tr.setMeta(uploadPlaceholderPlugin, {
              remove: { id },
            })
          );
        } else {
          const result = findAttachmentById(view.state, id);

          // if the attachment has been deleted then forget about updating it
          if (result === null) {
            return;
          }

          const [from, to] = result;
          view.dispatch(view.state.tr.deleteRange(from, to || from));
        }

        onShowToast(error.message || dictionary.fileUploadError);
      })
      .finally(() => {
        complete++;

        // once everything is done, let the user know
        if (complete === files.length && onFileUploadStop) {
          onFileUploadStop();
        }
      });
  }
};

export default insertFiles;
