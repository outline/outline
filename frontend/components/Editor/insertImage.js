// @flow
import uuid from 'uuid';
import uploadFile from 'utils/uploadFile';
import type { Editor, Transform } from './types';

export default async function insertImageFile(
  transform: Transform,
  file: window.File,
  editor: Editor,
  onImageUploadStart: () => void,
  onImageUploadStop: () => void
) {
  onImageUploadStart();

  try {
    // load the file as a data URL
    const id = uuid.v4();
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const src = reader.result;

      // insert into document as uploading placeholder
      const state = transform
        .insertBlock({
          type: 'image',
          isVoid: true,
          data: { src, id, loading: true },
        })
        .apply();
      editor.onChange(state);
    });
    reader.readAsDataURL(file);

    // now we have a placeholder, start the upload
    const asset = await uploadFile(file);
    const src = asset.url;

    // we dont use the original transform provided to the callback here
    // as the state may have changed significantly in the time it took to
    // upload the file.
    const state = editor.getState();
    const finalTransform = state.transform();
    const placeholder = state.document.findDescendant(
      node => node.data && node.data.get('id') === id
    );

    return finalTransform.setNodeByKey(placeholder.key, {
      data: { src, loading: false },
    });
  } catch (err) {
    throw err;
  } finally {
    onImageUploadStop();
  }
}
