// @flow
import EditList from 'slate-edit-list';

export default EditList({
  types: ['ordered-list', 'bulleted-list', 'todo-list'],
  typeItem: 'list-item',
  typeDefault: 'paragraph',
});
