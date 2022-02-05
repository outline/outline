import { NodeSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import uploadPlaceholderPlugin, {
  findPlaceholder,
} from "../lib/uploadPlaceholder";
import { ToastType } from "../types";

let uploadId = 0;

export type Options = {
  dictionary: any;
  replaceExisting?: boolean;
  uploadImage: (file: File) => Promise<string>;
  onImageUploadStart?: () => void;
  onImageUploadStop?: () => void;
  onShowToast?: (message: string, code: string) => void;
};

const insertFiles = function (
  view: EditorView,
  event: Event | React.ChangeEvent<HTMLInputElement>,
  pos: number,
  files: File[],
  options: Options
): void {
  // filter to only include image files
  const images = files.filter((file) => /image/i.test(file.type));
  if (images.length === 0) {
    return;
  }

  const {
    dictionary,
    uploadImage,
    onImageUploadStart,
    onImageUploadStop,
    onShowToast,
  } = options;

  if (!uploadImage) {
    console.warn(
      "uploadImage callback must be defined to handle image uploads."
    );
    return;
  }

  // okay, we have some dropped images and a handler – lets stop this
  // event going any further up the stack
  event.preventDefault();

  // let the user know we're starting to process the images
  if (onImageUploadStart) {
    onImageUploadStart();
  }

  const { schema } = view.state;

  // we'll use this to track of how many images have succeeded or failed
  let complete = 0;

  // the user might have dropped multiple images at once, we need to loop
  for (const file of images) {
    const id = `upload-${uploadId++}`;

    const { tr } = view.state;

    // insert a placeholder at this position, or mark an existing image as being
    // replaced
    tr.setMeta(uploadPlaceholderPlugin, {
      add: {
        id,
        file,
        pos,
        replaceExisting: options.replaceExisting,
      },
    });
    view.dispatch(tr);

    // start uploading the image file to the server. Using "then" syntax
    // to allow all placeholders to be entered at once with the uploads
    // happening in the background in parallel.
    uploadImage(file)
      .then((src) => {
        // otherwise, insert it at the placeholder's position, and remove
        // the placeholder itself
        const newImg = new Image();

        newImg.onload = () => {
          const result = findPlaceholder(view.state, id);

          // if the content around the placeholder has been deleted
          // then forget about inserting this image
          if (result === null) {
            return;
          }

          const [from, to] = result;
          view.dispatch(
            view.state.tr
              .replaceWith(from, to || from, schema.nodes.image.create({ src }))
              .setMeta(uploadPlaceholderPlugin, { remove: { id } })
          );

          // If the users selection is still at the image then make sure to select
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
      })
      .catch((error) => {
        console.error(error);

        // cleanup the placeholder if there is a failure
        const transaction = view.state.tr.setMeta(uploadPlaceholderPlugin, {
          remove: { id },
        });
        view.dispatch(transaction);

        // let the user know
        if (onShowToast) {
          onShowToast(dictionary.imageUploadError, ToastType.Error);
        }
      })
      .finally(() => {
        complete++;

        // once everything is done, let the user know
        if (complete === images.length && onImageUploadStop) {
          onImageUploadStop();
        }
      });
  }
};

export default insertFiles;
