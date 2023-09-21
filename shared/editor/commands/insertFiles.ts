import * as Sentry from "@sentry/react";
import { NodeSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { v4 as uuidv4 } from "uuid";
import FileHelper from "../lib/FileHelper";
import uploadPlaceholderPlugin, {
  findPlaceholder,
} from "../lib/uploadPlaceholder";
import findAttachmentById from "../queries/findAttachmentById";

export type Options = {
  /** Dictionary object containing translation strings */
  dictionary: Record<string, string | ((...args: any) => string)>;
  /** Set to true to force images and videos to become file attachments */
  isAttachment?: boolean;
  /** Set to true to replace any existing image at the users selection */
  replaceExisting?: boolean;
  /** Callback fired to upload a file */
  uploadFile?: (file: File) => Promise<string>;
  /** Callback fired when the user starts a file upload */
  onFileUploadStart?: () => void;
  /** Callback fired when the user completes a file upload */
  onFileUploadStop?: () => void;
  /** Callback fired when a toast needs to be displayed */
  onShowToast: (message: string) => void;
  /** Attributes to overwrite */
  attrs?: {
    /** Width to use when inserting image */
    width?: number;
    /** Height to use when inserting image */
    height?: number;
  };
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

  // okay, we have some dropped files and a handler – lets stop this
  // event going any further up the stack
  event.preventDefault();

  // let the user know we're starting to process the files
  onFileUploadStart?.();

  const { schema } = view.state;

  // we'll use this to track of how many files have succeeded or failed
  let complete = 0;
  let attachmentPlaceholdersSet = false;

  const filesToUpload = files.map((file) => ({
    id: `upload-${uuidv4()}`,
    isImage:
      FileHelper.isImage(file) && !options.isAttachment && !!schema.nodes.image,
    isVideo:
      FileHelper.isVideo(file) && !options.isAttachment && !!schema.nodes.video,
    file,
  }));

  // the user might have dropped multiple files at once, we need to loop
  for (const upload of filesToUpload) {
    const { tr } = view.state;

    if (upload.isImage) {
      // insert a placeholder at this position, or mark an existing file as being
      // replaced
      tr.setMeta(uploadPlaceholderPlugin, {
        add: {
          id: upload.id,
          file: upload.file,
          pos,
          isImage: true,
          replaceExisting: options.replaceExisting,
        },
      });
      view.dispatch(tr);
    } else if (upload.isVideo) {
      // insert a placeholder at this position, or mark an existing file as being
      // replaced
      tr.setMeta(uploadPlaceholderPlugin, {
        add: {
          id: upload.id,
          file: upload.file,
          pos,
          isVideo: true,
        },
      });
      view.dispatch(tr);
    } else if (!attachmentPlaceholdersSet) {
      // Skip if the editor does not support attachments.
      if (!view.state.schema.nodes.attachment) {
        continue;
      }

      const attachmentsToUpload = filesToUpload.filter(
        (i) => i.isImage === false
      );

      view.dispatch(
        tr.insert(
          pos,
          attachmentsToUpload.map((attachment) =>
            schema.nodes.attachment.create({
              id: attachment.id,
              title: attachment.file.name ?? dictionary.untitled,
              size: attachment.file.size,
            })
          )
        )
      );
      attachmentPlaceholdersSet = true;
    }

    // start uploading the file to the server. Using "then" syntax
    // to allow all placeholders to be entered at once with the uploads
    // happening in the background in parallel.
    uploadFile?.(upload.file)
      .then(async (src) => {
        if (upload.isImage) {
          const newImg = new Image();
          newImg.onload = () => {
            const result = findPlaceholder(view.state, upload.id);

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
                  schema.nodes.image.create({ src, ...options.attrs })
                )
                .setMeta(uploadPlaceholderPlugin, { remove: { id: upload.id } })
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

          newImg.onerror = () => {
            throw new Error(`Error loading image: ${src}`);
          };

          newImg.src = src;
        } else if (upload.isVideo) {
          const result = findPlaceholder(view.state, upload.id);

          // if the content around the placeholder has been deleted
          // then forget about inserting this file
          if (result === null) {
            return;
          }

          const [from, to] = result;
          const dimensions = await FileHelper.getVideoDimensions(upload.file);

          view.dispatch(
            view.state.tr
              .replaceWith(
                from,
                to || from,
                schema.nodes.video.create({
                  src,
                  title: upload.file.name ?? dictionary.untitled,
                  width: dimensions.width,
                  height: dimensions.height,
                  ...options.attrs,
                })
              )
              .setMeta(uploadPlaceholderPlugin, { remove: { id: upload.id } })
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
        } else {
          const result = findAttachmentById(view.state, upload.id);

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
                title: upload.file.name ?? dictionary.untitled,
                size: upload.file.size,
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
        if (upload.isImage || upload.isVideo) {
          view.dispatch(
            view.state.tr.setMeta(uploadPlaceholderPlugin, {
              remove: { id: upload.id },
            })
          );
        } else {
          const result = findAttachmentById(view.state, upload.id);

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
