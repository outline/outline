// @flow
import * as React from "react";
import * as Y from "yjs";
import Editor from "components/Editor";
import useCurrentUser from "hooks/useCurrentUser";
import MultiplayerExtension from "multiplayer/MultiplayerExtension";
import { WebsocketProvider } from "multiplayer/WebsocketProvider";

type Props = {
  multiplayer: {
    isConnected: boolean,
    isReconnecting: boolean,
    isRemoteSynced: boolean,
    provider: ?WebsocketProvider,
    doc: Y.Doc,
  },
};

export default function MultiplayerEditor({ multiplayer, ...props }: Props) {
  const user = useCurrentUser();
  const [showCachedDocument, setShowCachedDocument] = React.useState(true);
  const { provider, doc, isRemoteSynced } = multiplayer;

  React.useEffect(() => {
    if (isRemoteSynced) {
      setTimeout(() => setShowCachedDocument(false), 100);
    }
  }, [showCachedDocument, isRemoteSynced]);

  const extensions = React.useMemo(() => {
    console.log("extensions");

    return [
      new MultiplayerExtension({
        user,
        provider,
        doc,
      }),
    ];
  }, [user, provider, doc]);

  return (
    <span style={{ position: "relative" }}>
      {isRemoteSynced && (
        <Editor
          {...props}
          key="multiplayer"
          defaultValue={undefined}
          value={undefined}
          extensions={extensions}
          style={{ position: "absolute", width: "100%" }}
        />
      )}
      {showCachedDocument && (
        <Editor
          {...props}
          style={{ position: "absolute", width: "100%" }}
          readOnly
        />
      )}
    </span>
  );
}
