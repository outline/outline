import DropOrPasteImages from 'slate-drop-or-paste-images';
import PasteLinkify from 'slate-paste-linkify';
import EditList from 'slate-edit-list';
import CollapseOnEscape from 'slate-collapse-on-escape';
import TrailingBlock from 'slate-trailing-block';
import uploadFile from '../../utils/uploadFile';
import KeyboardShortcuts from './plugins/KeyboardShortcuts';
import MarkdownShortcuts from './plugins/MarkdownShortcuts';

const plugins = [
  PasteLinkify({
    type: 'link',
    collapseTo: 'end',
  }),
  DropOrPasteImages({
    extensions: ['png', 'jpg', 'gif'],
    applyTransform: async (transform, file) => {
      try {
        const asset = await uploadFile(file);
        const alt = file.name;
        const src = asset.url;

        return transform.insertBlock({
          type: 'image',
          isVoid: true,
          data: { src, alt },
        });
      } catch (err) {
        // TODO: Show a failure alert
      }
    },
  }),
  EditList({
    typeUL: 'bulleted-list',
    typeOL: 'ordered-list',
    typeItem: 'list-item',
  }),
  CollapseOnEscape({ toEdge: 'end' }),
  TrailingBlock({ type: 'paragraph' }),
  KeyboardShortcuts(),
  MarkdownShortcuts(),
];

export default plugins;
