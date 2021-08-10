// @flow
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as React from "react";
import * as Y from "yjs";
import Editor, { type Props } from "components/Editor";
import env from "env";
import useCurrentToken from "hooks/useCurrentToken";
import useCurrentUser from "hooks/useCurrentUser";
import useUnmount from "hooks/useUnmount";
import MultiplayerExtension from "multiplayer/MultiplayerExtension";

const style = { position: "absolute", width: "100%" };

function MultiplayerEditor(props: Props, ref: any) {
  const currentUser = useCurrentUser();
  const token = useCurrentToken();
  const [provider, setProvider] = React.useState();
  const [ydoc] = React.useState(() => new Y.Doc());

  React.useLayoutEffect(() => {
    const provider = new HocuspocusProvider({
      url: env.MULTIPLAYER_URL,
      debug: env.ENVIRONMENT === "development",
      name: `document.${props.id || ""}`,
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

    setProvider(provider);
  }, [props.id, token, ydoc]);

  const [showCachedDocument, setShowCachedDocument] = React.useState(true);
  const [isRemoteSynced, setRemoteSynced] = React.useState(true);

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
    if (!provider) {
      return [];
    }

    return [
      new MultiplayerExtension({
        user,
        provider,
        document: ydoc,
      }),
    ];
  }, [provider, user, ydoc]);

  useUnmount(() => {
    provider?.destroy();
  });

  return (
    <span style={{ position: "relative" }}>
      {extensions.length ? (
        <Editor
          {...props}
          defaultValue={undefined}
          value={undefined}
          extensions={extensions}
          style={style}
          ref={ref}
        />
      ) : undefined}
      {showCachedDocument && <Editor {...props} readOnly />}
    </span>
  );
}

export default React.forwardRef<any, typeof MultiplayerEditor>(
  MultiplayerEditor
);
