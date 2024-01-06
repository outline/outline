import * as React from "react";
import { basicExtensions, withComments } from "@shared/editor/nodes";
import Editor, { Props as EditorProps } from "~/components/Editor";
import type { Editor as SharedEditor } from "~/editor";
import ClipboardTextSerializer from "~/editor/extensions/ClipboardTextSerializer";
import EmojiMenuExtension from "~/editor/extensions/EmojiMenu";
import Keys from "~/editor/extensions/Keys";
import MentionMenuExtension from "~/editor/extensions/MentionMenu";
import PasteHandler from "~/editor/extensions/PasteHandler";
import PreventTab from "~/editor/extensions/PreventTab";
import SmartText from "~/editor/extensions/SmartText";

const extensions = [
  ...withComments(basicExtensions),
  SmartText,
  PasteHandler,
  ClipboardTextSerializer,
  EmojiMenuExtension,
  MentionMenuExtension,
  // Order these default key handlers last
  PreventTab,
  Keys,
];

const CommentEditor = (
  props: EditorProps,
  ref: React.RefObject<SharedEditor>
) => <Editor extensions={extensions} {...props} ref={ref} />;

export default React.forwardRef(CommentEditor);
