// @flow
import * as React from "react";
import Editor from "./Editor";
import useCurrentUser from "hooks/useCurrentUser";
import MultiplayerExtension from "multiplayer/MultiplayerExtension";

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

export default function MultiplayerEditor({ multiplayer, ...props }: Props) {
  const user = useCurrentUser();

  console.log("isRemoteSynced", multiplayer.isRemoteSynced);

  return multiplayer.isRemoteSynced ? (
    <Editor
      {...props}
      defaultValue={undefined}
      value={undefined}
      extensions={[
        new MultiplayerExtension({
          user,
          ...multiplayer,
        }),
      ]}
    />
  ) : (
    <Editor {...props} readOnly />
  );
}
