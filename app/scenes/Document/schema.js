// @flow
import { cloneDeep } from 'lodash';
import { Block, SlateError, Editor } from 'slate';
import { schema as originalSchema } from 'rich-markdown-editor';

const schema = cloneDeep(originalSchema);

// add rules to the schema to ensure the first node is a heading
// schema.document.nodes.unshift({ match: { type: 'heading1' }, min: 1, max: 1 });
schema.document.normalize = (editor: Editor, error: SlateError) => {
  switch (error.code) {
    case 'child_type_invalid': {
      return editor.setNodeByKey(
        error.child.key,
        error.index === 0 ? 'heading1' : 'paragraph'
      );
    }
    case 'child_required': {
      const block = Block.create(error.index === 0 ? 'heading1' : 'paragraph');
      return editor.insertNodeByKey(error.node.key, error.index, block);
    }
    default:
  }
};

export default schema;
