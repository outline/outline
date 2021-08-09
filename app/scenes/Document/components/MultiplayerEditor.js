// @flow
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as React from "react";
import * as Y from "yjs";
import Editor from "components/Editor";
import env from "env";
import useCurrentToken from "hooks/useCurrentToken";
import useCurrentUser from "hooks/useCurrentUser";
import MultiplayerExtension from "multiplayer/MultiplayerExtension";

const style = { position: "absolute", width: "100%" };

// TODO: typing
function MultiplayerEditor(props: any, ref) {
  const currentUser = useCurrentUser();
  const token = useCurrentToken();
  const [showCachedDocument, setShowCachedDocument] = React.useState(true);
  const [isRemoteSynced, setRemoteSynced] = React.useState(true);

  React.useEffect(() => {
    console.log("mount");
  }, []);

  React.useEffect(() => {
    if (isRemoteSynced) {
      setTimeout(() => setShowCachedDocument(false), 100);
    }
  }, [isRemoteSynced]);

  const user = React.useMemo(() => {
    return {
      id: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
    };
  }, [currentUser.id, currentUser.color, currentUser.name]);

  const extensions = React.useMemo(() => {
    const ydoc = new Y.Doc();
    console.log("new HocuspocusProvider", ydoc);

    const provider = new HocuspocusProvider({
      url: env.MULTIPLAYER_URL,
      debug: env.ENVIRONMENT === "development",
      name: `document.${props.id}`,
      document: ydoc,
      parameters: {
        token,
      },
    });

    const handleSynced = () => {
      setRemoteSynced(true);
      provider.off("sync", handleSynced);
    };

    provider.on("sync", handleSynced);

    return [
      new MultiplayerExtension({
        user,
        provider,
        document: ydoc,
      }),
    ];
  }, [user, token, props.id]);

  return (
    <Editor
      {...props}
      defaultValue={undefined}
      value={undefined}
      extensions={extensions}
      ref={ref}
    />
  );

  // return (
  //   <span style={{ position: "relative" }}>
  //     <Editor
  //       {...props}
  //       defaultValue={undefined}
  //       value={undefined}
  //       extensions={extensions}
  //       style={style}
  //       ref={ref}
  //     />
  //     {/* {showCachedDocument && <Editor {...props} style={style} readOnly />} */}
  //   </span>
  // );
}

export default React.forwardRef<any, typeof MultiplayerEditor>(
  MultiplayerEditor
);
