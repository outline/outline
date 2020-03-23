// @flow
import { Editor } from 'slate';
import isModKey from 'rich-markdown-editor/lib/lib/isModKey';

export default [
  {
    onKeyDown(ev: SyntheticKeyboardEvent<>, editor: Editor, next: Function) {
      if (ev.key === 'p' && ev.shiftKey && isModKey(ev)) {
        return editor.props.onPublish(ev);
      }

      return next();
    },
  },
];
