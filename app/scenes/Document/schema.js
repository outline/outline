// @flow
import { cloneDeep } from 'lodash';
import { Block, Change, Node, Mark } from 'slate';
import { schema as originalSchema } from 'rich-markdown-editor';

const schema = cloneDeep(originalSchema);

// add rules to the schema to ensure the first node is a heading
schema.document.nodes.unshift({ types: ['heading1'], min: 1, max: 1 });
schema.document.normalize = (
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
};

export default schema;
