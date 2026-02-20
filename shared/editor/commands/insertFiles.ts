import * as Sentry from "@sentry/react";
import { v4 as uuidv4 } from "uuid";
import type { EditorView } from "prosemirror-view";
import { toast } from "sonner";
import type { Dictionary } from "~/hooks/useDictionary";
import FileHelper from "../lib/FileHelper";
import uploadPlaceholderPlugin, {
  findPlaceholder,
} from "../lib/uploadPlaceholder";

export type Options = {
  /** Dictionary object containing translation strings */
  dictionary: Dictionary;
  /** Set to true to force images and videos to become file attachments */
  isAttachment?: boolean;
  /** Set to true to replace any existing image at the users selection */
  replaceExisting?: boolean;
  /** Callback fired to upload a file */
  uploadFile?: (
    file: File | string,
    options?: {
      id?: string;
      onProgress?: (fractionComplete: number) => void;
    }
  ) => Promise<string>;
  /** Callback fired when the user starts a file upload */
  onFileUploadStart?: () => void;
  /** Callback fired when the user completes a file upload */
  onFileUploadStop?: () => void;
  /** Callback fired when file upload progress changes */
  onFileUploadProgress?: (id: string, fractionComplete: number) => void;
  /** Attributes to overwrite */
  attrs?: {
    /** Width to use when inserting image */
    width?: number;
    /** Height to use when inserting image */
    height?: number;
    /** Alt text / caption to use when inserting image */
    alt?: string | null;
    /** Layout class for alignment when inserting image */
    layoutClass?: string | null;
  };
};

const insertFiles = async function (
  view: EditorView,
  event:
    | Event
    | React.ChangeEvent<HTMLInputElement>
    | React.DragEvent<HTMLDivElement>,
  pos: number,
  files: File[],
  options: Options
) {
  const {
    dictionary,
    uploadFile,
    onFileUploadStart,
    onFileUploadStop,
    onFileUploadProgress,
  } = options;

  // okay, we have some dropped files and a handler – lets stop this
  // event going any further up the stack
  event.preventDefault();

  // let the user know we're starting to process the files
  onFileUploadStart?.();

  const { schema } = view.state;

  // we'll use this to track of how many files have succeeded or failed
  let complete = 0;

  const filesToUpload = await Promise.all(
    files.map(async (file) => {
      const isImage =
        FileHelper.isImage(file.type) &&
        !options.isAttachment &&
        !!schema.nodes.image;
      const isVideo =
        FileHelper.isVideo(file.type) &&
        !options.isAttachment &&
        !!schema.nodes.video;
      const isPdf = FileHelper.isPdf(file.type) && !options.isAttachment;
      const getDimensions = isImage
        ? FileHelper.getImageDimensions
        : isVideo
          ? FileHelper.getVideoDimensions
          : undefined;

      return {
        id: uuidv4(),
        dimensions: await getDimensions?.(file),
        source: await FileHelper.getImageSourceAttr(file),
        isImage,
        isVideo,
        isPdf,
        file,
      };
    })
  );

  // the user might have dropped multiple files at once, we need to loop
  for (const upload of filesToUpload) {
    const { tr } = view.state;

    tr.setMeta(uploadPlaceholderPlugin, {
      add: {
        pos,
        ...upload,
        replaceExisting: options.replaceExisting,
      },
    });
    view.dispatch(tr);

    // start uploading the file to the server. Using "then" syntax
    // to allow all placeholders to be entered at once with the uploads
    // happening in the background in parallel.
    uploadFile?.(upload.file, {
      id: upload.id,
      onProgress: (progress) => onFileUploadProgress?.(upload.id, progress),
    })
      // then this should be able to get the full URL as well
      .then(async (src) => {
        if (view.isDestroyed) {
          return;
        }
        if (upload.isImage) {
          const newImg = new Image();
          newImg.onload = async () => {
            const result = findPlaceholder(view.state, upload.id);
            if (result === null) {
              return;
            }

            if (view.isDestroyed) {
              return;
            }

            const [from, to] = result;
            view.dispatch(
              view.state.tr
                .replaceWith(
                  from,
                  to || from,
                  schema.nodes.image.create({
                    src,
                    source: upload.source,
                    ...(upload.dimensions ?? {}),
                    ...options.attrs,
                  })
                )
                .setMeta(uploadPlaceholderPlugin, { remove: { id: upload.id } })
            );
          };

          newImg.onerror = () => {
            throw new Error(`Error loading image: ${src}`);
          };

          newImg.src = src;
        } else if (upload.isVideo) {
          const result = findPlaceholder(view.state, upload.id);
          if (result === null) {
            return;
          }

          const [from, to] = result;

          if (view.isDestroyed) {
            return;
          }

          view.dispatch(
            view.state.tr
              .replaceWith(
                from,
                to || from,
                schema.nodes.video.create({
                  src,
                  title: upload.file.name ?? dictionary.untitled,
                  ...upload.dimensions,
                  ...options.attrs,
                })
              )
              .setMeta(uploadPlaceholderPlugin, { remove: { id: upload.id } })
          );
        } else {
          const result = findPlaceholder(view.state, upload.id);
          if (result === null) {
            return;
          }

          const [from, to] = result;

          view.dispatch(
            view.state.tr
              .replaceWith(
                from,
                to || from,
                schema.nodes.attachment.create({
                  href: src,
                  title: upload.file.name ?? dictionary.untitled,
                  size: upload.file.size,
                  contentType: upload.file.type,
                  preview: upload.isPdf,
                  ...options.attrs,
                })
              )
              .setMeta(uploadPlaceholderPlugin, { remove: { id: upload.id } })
          );
        }
      })
      .catch((error) => {
        Sentry.captureException(error);

        // oxlint-disable-next-line no-console
        console.error(error);

        if (view.isDestroyed) {
          return;
        }

        // cleanup the placeholder if there is a failure
        view.dispatch(
          view.state.tr.setMeta(uploadPlaceholderPlugin, {
            remove: { id: upload.id },
          })
        );

        toast.error(error.message || dictionary.fileUploadError);
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
