import * as Sentry from "@sentry/react";
import invariant from "invariant";
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

  invariant(
    uploadFile,
    "uploadFile callback must be defined to handle uploads."
  );

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
  let attachmentPlaceholdersSet = false;

  const filesToUpload = files.map((file) => ({
    id: `upload-${uuidv4()}`,
    isImage: file.type.startsWith("image/") && !options.isAttachment,
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
    } else if (!attachmentPlaceholdersSet) {
      const attachmentsToUpload = filesToUpload.filter(
        (i) => i.isImage === false
      );

      view.dispatch(
        tr.insert(
          pos,
          attachmentsToUpload.map((attachment) =>
            schema.nodes.attachment.create({
              id: attachment.id,
              title: attachment.file.name ?? "Untitled",
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
    uploadFile(upload.file)
      .then((src) => {
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

          newImg.onerror = (event) => {
            throw new Error(`Error loading image: ${event}`);
          };

          newImg.src = src;
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
                title: upload.file.name ?? "Untitled",
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
        if (upload.isImage) {
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
