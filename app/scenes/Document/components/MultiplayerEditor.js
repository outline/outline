// @flow
import * as React from "react";
import Editor from "./Editor";

type Props = {|
  onChangeTitle: (event: SyntheticInputEvent<>) => void,
  title: string,
  defaultValue: string,
  document: Document,
  isDraft: boolean,
  readOnly?: boolean,
  onSave: ({ publish?: boolean, done?: boolean, autosave?: boolean }) => mixed,
  innerRef: { current: any },
|};

export default function MultiplayerEditor(props: Props) {
  return <Editor {...props} />;
}
