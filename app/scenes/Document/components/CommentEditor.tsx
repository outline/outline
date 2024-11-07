import { observer } from "mobx-react";
import * as React from "react";
import { basicExtensions, withComments } from "@shared/editor/nodes";
import HardBreak from "@shared/editor/nodes/HardBreak";
import Editor, { Props as EditorProps } from "~/components/Editor";
import type { Editor as SharedEditor } from "~/editor";
import ClipboardTextSerializer from "~/editor/extensions/ClipboardTextSerializer";
import EmojiMenuExtension from "~/editor/extensions/EmojiMenu";
import Keys from "~/editor/extensions/Keys";
import MentionMenuExtension from "~/editor/extensions/MentionMenu";
import PasteHandler from "~/editor/extensions/PasteHandler";
import PreventTab from "~/editor/extensions/PreventTab";
import SmartText from "~/editor/extensions/SmartText";
import useCurrentUser from "~/hooks/useCurrentUser";

const extensions = [
  ...withComments(basicExtensions),
  HardBreak,
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
) => {
  const user = useCurrentUser({ rejectOnEmpty: false });

  return (
    <Editor extensions={extensions} userId={user?.id} {...props} ref={ref} />
  );
};

export default observer(React.forwardRef(CommentEditor));
