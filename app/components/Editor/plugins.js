// @flow
import InsertImages from '@tommoor/slate-drop-or-paste-images';
import PasteLinkify from 'slate-paste-linkify';
import CollapseOnEscape from 'slate-collapse-on-escape';
import TrailingBlock from 'slate-trailing-block';
import EditCode from 'slate-edit-code';
import Prism from 'slate-prism';
import EditList from './plugins/EditList';
import KeyboardShortcuts from './plugins/KeyboardShortcuts';
import MarkdownShortcuts from './plugins/MarkdownShortcuts';
import { insertImageFile } from './changes';

type Options = {
  onImageUploadStart: () => void,
  onImageUploadStop: () => void,
};

const createPlugins = ({ onImageUploadStart, onImageUploadStop }: Options) => {
  return [
    PasteLinkify({
      type: 'link',
      collapseTo: 'end',
    }),
    InsertImages({
      extensions: ['png', 'jpg', 'gif', 'webp'],
      insertImage: async (change, file, editor) => {
        return change.call(
          insertImageFile,
          file,
          editor,
          onImageUploadStart,
          onImageUploadStop
        );
      },
    }),
    EditList,
    EditCode({
      containerType: 'code',
      lineType: 'code-line',
      exitBlocktype: 'paragraph',
      allowMarks: false,
      selectAll: true,
    }),
    Prism({
      onlyIn: node => node.type === 'code',
      getSyntax: node => 'javascript',
    }),
    CollapseOnEscape({ toEdge: 'end' }),
    TrailingBlock({ type: 'paragraph' }),
    KeyboardShortcuts(),
    MarkdownShortcuts(),
  ];
};

export default createPlugins;
