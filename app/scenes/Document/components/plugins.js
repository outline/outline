// @flow
import { Node, Editor } from 'slate';
import Placeholder from 'rich-markdown-editor/lib/plugins/Placeholder';

export default [
  Placeholder({
    placeholder: 'Start with a title…',
    when: (editor: Editor, node: Node) => {
      if (editor.readOnly) return false;
      if (node.object !== 'block') return false;
      if (node.type !== 'heading1') return false;
      if (node.text !== '') return false;
      if (editor.value.document.nodes.first() !== node) return false;
      return true;
    },
  }),
  Placeholder({
    placeholder: '…the rest is your canvas',
    when: (editor: Editor, node: Node) => {
      if (editor.readOnly) return false;
      if (node.object !== 'block') return false;
      if (node.type !== 'paragraph') return false;
      if (node.text !== '') return false;
      if (editor.value.document.getDepth(node.key) !== 1) return false;
      return true;
    },
  }),
];
