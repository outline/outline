// @flow
import DropOrPasteImages from '@tommoor/slate-drop-or-paste-images';
import PasteLinkify from 'slate-paste-linkify';
import EditList from 'slate-edit-list';
import CollapseOnEscape from 'slate-collapse-on-escape';
import TrailingBlock from 'slate-trailing-block';
import EditCode from 'slate-edit-code';
import Prism from 'slate-prism';
import KeyboardShortcuts from './plugins/KeyboardShortcuts';
import MarkdownShortcuts from './plugins/MarkdownShortcuts';
import insertImage from './insertImage';

const onlyInCode = node => node.type === 'code';

type Options = {
  onImageUploadStart: Function,
  onImageUploadStop: Function,
};

const createPlugins = ({ onImageUploadStart, onImageUploadStop }: Options) => {
  return [
    PasteLinkify({
      type: 'link',
      collapseTo: 'end',
    }),
    DropOrPasteImages({
      extensions: ['png', 'jpg', 'gif'],
      applyTransform: (transform, editor, file) => {
        return insertImage(
          transform,
          file,
          editor,
          onImageUploadStart,
          onImageUploadStop
        );
      },
    }),
    EditList({
      types: ['ordered-list', 'bulleted-list', 'todo-list'],
      typeItem: 'list-item',
    }),
    EditCode({
      onlyIn: onlyInCode,
      containerType: 'code',
      lineType: 'code-line',
      exitBlocktype: 'paragraph',
      selectAll: true,
    }),
    Prism({
      onlyIn: onlyInCode,
      getSyntax: node => 'javascript',
    }),
    CollapseOnEscape({ toEdge: 'end' }),
    TrailingBlock({ type: 'paragraph' }),
    KeyboardShortcuts(),
    MarkdownShortcuts(),
  ];
};

export default createPlugins;
