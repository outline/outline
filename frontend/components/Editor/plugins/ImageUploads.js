// @flow
import uuid from 'uuid';
import DropOrPasteImages from 'slate-drop-or-paste-images';
import uploadFile from 'utils/uploadFile';

type Options = {
  onImageUploadStart: Function,
  onImageUploadStop: Function,
};

export default function ImageUploads({
  onImageUploadStart,
  onImageUploadStop,
}: Options) {
  return DropOrPasteImages({
    extensions: ['png', 'jpg', 'gif'],
    applyTransform: async (transform, editor, file) => {
      onImageUploadStart();

      // load the file as a data URL
      const id = uuid.v4();
      const alt = file.name;
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const src = reader.result;

        // insert into document as uploading placeholder
        const state = transform
          .insertBlock({
            type: 'image',
            isVoid: true,
            data: { src, alt, id, loading: true },
          })
          .apply();
        editor.onChange(state);
      });
      reader.readAsDataURL(file);

      // now we have a placeholder, start the upload
      try {
        const asset = await uploadFile(file);
        const src = asset.url;

        // we dont use the original transform provided to the callback here
        // as the state may have changed significantly in the time it took to
        // upload the file.
        const state = editor.getState();
        const transform = state.transform();
        const placeholder = state.document.findDescendant(
          node => node.data && node.data.get('id') === id
        );
        return transform.setNodeByKey(placeholder.key, {
          data: { src, alt, loading: false },
        });
      } catch (err) {
        // TODO: Show a failure alert
        console.error(err);
      } finally {
        onImageUploadStop();
      }
    },
  });
}
