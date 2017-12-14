// @flow
import { Change } from 'slate';
import { Editor } from 'slate-react';
import uuid from 'uuid';
import EditList from './plugins/EditList';
import { uploadFile } from 'utils/uploadFile';

const { changes } = EditList;

type Options = {
  type: string | Object,
  wrapper?: string | Object,
};

export function splitAndInsertBlock(change: Change, options: Options) {
  const { type, wrapper } = options;
  const parent = change.value.document.getParent(change.value.startBlock.key);

  // lists get some special treatment
  if (parent && parent.type === 'list-item') {
    change
      .collapseToStart()
      .call(changes.splitListItem)
      .collapseToEndOfPreviousBlock()
      .call(changes.unwrapList);
  }

  if (wrapper) change.collapseToStartOfNextBlock();

  // this is a hack as insertBlock with normalize: false does not appear to work
  change.insertBlock('paragraph').setBlock(type, { normalize: false });

  if (wrapper) change.wrapBlock(wrapper);
  return change;
}

export async function insertImageFile(
  change: Change,
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
      const node = {
        type: 'image',
        isVoid: true,
        data: { src, id, alt, loading: true },
      };

      // insert / replace into document as uploading placeholder replacing
      // empty paragraphs if available.
      if (
        !change.value.startBlock.text &&
        change.value.startBlock.type === 'paragraph'
      ) {
        change.setBlock(node);
      } else {
        change.insertBlock(node);
      }

      editor.onChange(change);
    });
    reader.readAsDataURL(file);

    // now we have a placeholder, start the upload
    const asset = await uploadFile(file);
    const src = asset.url;

    // we dont use the original change provided to the callback here
    // as the state may have changed significantly in the time it took to
    // upload the file.
    const placeholder = editor.value.document.findDescendant(
      node => node.data && node.data.get('id') === id
    );

    change.setNodeByKey(placeholder.key, {
      data: { src, alt, loading: false },
    });
    editor.onChange(change);
  } catch (err) {
    throw err;
  } finally {
    onImageUploadStop();
  }
}
