import DropOrPasteImages from 'slate-drop-or-paste-images';
import PasteLinkify from 'slate-paste-linkify';
import EditList from 'slate-edit-list';
import MarkdownShortcuts from './plugins/MarkdownShortcuts';
import TrailingBlock from 'slate-trailing-block';

const plugins = [
  PasteLinkify({
    type: 'link',
    collapseTo: 'end',
  }),
  DropOrPasteImages({
    extensions: ['png'],
    applyTransform: (transform, file) => {
      return transform.insertBlock({
        type: 'image',
        isVoid: true,
        data: { file },
      });
    },
  }),
  EditList({
    typeUL: 'bulleted-list',
    typeOL: 'ordered-list',
    typeItem: 'list-item',
  }),
  MarkdownShortcuts(),
  TrailingBlock({ type: 'paragraph' }),
];

export default plugins;
