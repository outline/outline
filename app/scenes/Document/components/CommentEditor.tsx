import * as React from "react";
import extensions from "@shared/editor/packages/basic";
import Editor, { Props as EditorProps } from "~/components/Editor";
import type { Editor as SharedEditor } from "~/editor";

const CommentEditor = (
  props: EditorProps,
  ref: React.RefObject<SharedEditor>
) => {
  return <Editor extensions={extensions} {...props} ref={ref} />;
};

export default React.forwardRef(CommentEditor);
