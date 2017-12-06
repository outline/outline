// @flow
import { Change } from 'slate';
import uuid from 'uuid';
import EditList from './plugins/EditList';
import uploadFile from 'utils/uploadFile';

const { changes } = EditList;

type Options = {
  type: string | Object,
  wrapper?: string | Object,
  append?: string | Object,
};

export function splitAndInsertBlock(change: Change, options: Options) {
  const { type, wrapper, append } = options;
  const parent = change.value.document.getParent(change.value.startBlock.key);

  // lists get some special treatment
  if (parent && parent.type === 'list-item') {
    change
      .collapseToStart()
      .call(changes.splitListItem)
      .collapseToEndOfPreviousBlock()
      .call(changes.unwrapList);
  }

  change.insertBlock(type);

  if (wrapper) change.wrapBlock(wrapper);
  if (append) change.insertBlock(append);

  return change;
}

export async function insertImageFile(
  change: Change,
  file: window.File,
  onImageUploadStart: () => void,
  onImageUploadStop: () => void
) {
  onImageUploadStart();
  console.log(file);
  try {
    // load the file as a data URL
    const id = uuid.v4();
    const alt = '';
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const src = reader.result;

      // insert into document as uploading placeholder
      change.insertBlock({
        type: 'image',
        isVoid: true,
        data: { src, id, alt, loading: true },
      });
      console.log('insertBlock', change);
    });
    reader.readAsDataURL(file);

    // now we have a placeholder, start the upload
    const asset = await uploadFile(file);
    const src = asset.url;

    // we dont use the original change provided to the callback here
    // as the state may have changed significantly in the time it took to
    // upload the file.
    const placeholder = change.value.document.findDescendant(
      node => node.data && node.data.get('id') === id
    );
    console.log('placeholder', placeholder);

    return change.setNodeByKey(placeholder.key, {
      data: { src, alt, loading: false },
    });
  } catch (err) {
    throw err;
  } finally {
    onImageUploadStop();
  }
}
