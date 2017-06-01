// @flow
import DropOrPasteImages from 'slate-drop-or-paste-images';
import PasteLinkify from 'slate-paste-linkify';
import EditList from 'slate-edit-list';
import CollapseOnEscape from 'slate-collapse-on-escape';
import TrailingBlock from 'slate-trailing-block';
import EditCode from 'slate-edit-code';
import Prism from 'slate-prism';
import uploadFile from 'utils/uploadFile';
import KeyboardShortcuts from './plugins/KeyboardShortcuts';
import MarkdownShortcuts from './plugins/MarkdownShortcuts';

const onlyInCode = node => node.type === 'code';

type CreatePluginsOptions = {
  onImageUploadStart: Function,
  onImageUploadStop: Function,
};

const createPlugins = ({
  onImageUploadStart,
  onImageUploadStop,
}: CreatePluginsOptions) => {
  return [
    PasteLinkify({
      type: 'link',
      collapseTo: 'end',
    }),
    DropOrPasteImages({
      extensions: ['png', 'jpg', 'gif'],
      applyTransform: async (transform, file) => {
        try {
          onImageUploadStart();
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
        } finally {
          onImageUploadStop();
        }
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
