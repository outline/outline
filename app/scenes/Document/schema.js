// @flow
import { cloneDeep } from 'lodash';
import { Block, SlateError, Editor } from 'slate';
import { schema as originalSchema } from 'rich-markdown-editor';

const schema = cloneDeep(originalSchema);

// add rules to the schema to ensure the first node is a heading
schema.document.nodes.unshift({ match: { type: 'heading1' }, min: 1, max: 1 });
schema.document.normalize = (editor: Editor, error: SlateError) => {
  switch (error.code) {
    case 'child_max_invalid': {
      return editor.setNodeByKey(
        error.child.key,
        error.index === 0 ? 'heading1' : 'paragraph'
      );
    }
    case 'child_min_invalid': {
      const missingTitle = error.index === 0;
      const firstNode = editor.value.document.nodes.get(0);
      if (!firstNode) {
        editor.insertNodeByKey(error.node.key, 0, Block.create('heading1'));
      } else {
        editor.setNodeByKey(firstNode.key, { type: 'heading1' });
      }

      const secondNode = editor.value.document.nodes.get(1);
      if (!secondNode) {
        editor.insertNodeByKey(error.node.key, 1, Block.create('paragraph'));
      } else {
        editor.setNodeByKey(secondNode.key, { type: 'paragraph' });
      }

      if (missingTitle) setImmediate(() => editor.moveFocusToStartOfDocument());

      return editor;
    }
    default:
  }
};

export default schema;
