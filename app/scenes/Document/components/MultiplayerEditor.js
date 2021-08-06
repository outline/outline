// @flow
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as React from "react";
import * as Y from "yjs";
import Editor from "components/Editor";
import env from "env";
import useCurrentUser from "hooks/useCurrentUser";
import MultiplayerExtension from "multiplayer/MultiplayerExtension";

// TODO: typing
export default function MultiplayerEditor(props: any) {
  const user = useCurrentUser();

  // TODO
  //const [showCachedDocument, setShowCachedDocument] = React.useState(true);

  // React.useEffect(() => {
  //   if (isRemoteSynced) {
  //     setTimeout(() => setShowCachedDocument(false), 100);
  //   }
  // }, [showCachedDocument, isRemoteSynced]);

  const extensions = React.useMemo(() => {
    console.log("extensions");

    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: env.MULTIPLAYER_URL,

      // TODO: pipe documentId
      name: "example-document",
      document: ydoc,
    });

    return [
      new MultiplayerExtension({
        user,
        provider,
        document: ydoc,
      }),
    ];
  }, [user]);

  return (
    <span style={{ position: "relative" }}>
      {true && (
        <Editor
          {...props}
          key="multiplayer"
          defaultValue={undefined}
          value={undefined}
          extensions={extensions}
          style={{ position: "absolute", width: "100%" }}
        />
      )}
      {/* {showCachedDocument && (
        <Editor
          {...props}
          style={{ position: "absolute", width: "100%" }}
          readOnly
        />
      )} */}
    </span>
  );
}
