// @flow
import uuid from 'uuid';
import uploadFile from 'utils/uploadFile';
import { Editor } from 'slate-react';
import type { change } from 'slate-prop-types';

export default async function insertImageFile(
  change: change,
  file: window.File,
  editor: Editor,
  onImageUploadStart: () => void,
  onImageUploadStop: () => void
) {
  onImageUploadStart();

  try {
    // load the file as a data URL
    const id = uuid.v4();
    const alt = '';
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const src = reader.result;

      // insert into document as uploading placeholder
      const state = change
        .insertBlock({
          type: 'image',
          isVoid: true,
          data: { src, id, alt, loading: true },
        })
        .apply();
      editor.onChange(state);
    });
    reader.readAsDataURL(file);

    // now we have a placeholder, start the upload
    const asset = await uploadFile(file);
    const src = asset.url;

    // we dont use the original change provided to the callback here
    // as the state may have changed significantly in the time it took to
    // upload the file.
    const state = editor.getState();
    const finalTransform = state.change();
    const placeholder = state.document.findDescendant(
      node => node.data && node.data.get('id') === id
    );

    return finalTransform.setNodeByKey(placeholder.key, {
      data: { src, alt, loading: false },
    });
  } catch (err) {
    throw err;
  } finally {
    onImageUploadStop();
  }
}
