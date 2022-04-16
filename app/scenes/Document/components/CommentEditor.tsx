import * as React from "react";
import extensions from "@shared/editor/packages/basic";
import Editor, { Props as EditorProps } from "~/components/Editor";

const CommentEditor: React.FC<EditorProps> = (props) => {
  return <Editor extensions={extensions} {...props} />;
};

export default CommentEditor;
