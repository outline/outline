// @flow
import { Block, Change, Node, Mark } from 'slate';

const schema = {
  blocks: {
    heading1: { nodes: [{ kinds: ['text'] }], marks: [''] },
    heading2: { nodes: [{ kinds: ['text'] }], marks: [''] },
    heading3: { nodes: [{ kinds: ['text'] }], marks: [''] },
    heading4: { nodes: [{ kinds: ['text'] }], marks: [''] },
    heading5: { nodes: [{ kinds: ['text'] }], marks: [''] },
    heading6: { nodes: [{ kinds: ['text'] }], marks: [''] },
    'block-quote': { marks: [''] },
    table: {
      nodes: [{ types: ['table-row', 'table-head', 'table-cell'] }],
    },
    'horizontal-rule': {
      isVoid: true,
    },
    'block-toolbar': {
      isVoid: true,
    },
  },
  document: {
    nodes: [
      { types: ['heading1'], min: 1, max: 1 },
      {
        types: [
          'paragraph',
          'heading1',
          'heading2',
          'heading3',
          'heading4',
          'heading5',
          'heading6',
          'block-quote',
          'code',
          'horizontal-rule',
          'image',
          'bulleted-list',
          'ordered-list',
          'todo-list',
          'block-toolbar',
          'table',
        ],
        min: 1,
      },
    ],
    normalize: (
      change: Change,
      reason: string,
      {
        node,
        child,
        mark,
        index,
      }: { node: Node, mark?: Mark, child: Node, index: number }
    ) => {
      switch (reason) {
        case 'child_type_invalid': {
          return change.setNodeByKey(
            child.key,
            index === 0 ? 'heading1' : 'paragraph'
          );
        }
        case 'child_required': {
          const block = Block.create(index === 0 ? 'heading1' : 'paragraph');
          return change.insertNodeByKey(node.key, index, block);
        }
        default:
      }
    },
  },
};

export default schema;
