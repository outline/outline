// @flow
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as React from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import Editor, { type Props as EditorProps } from "components/Editor";
import env from "env";
import useCurrentToken from "hooks/useCurrentToken";
import useCurrentUser from "hooks/useCurrentUser";
import useStores from "hooks/useStores";
import useUnmount from "hooks/useUnmount";
import MultiplayerExtension from "multiplayer/MultiplayerExtension";

// const style = { position: "absolute", width: "100%" };

type Props = {|
  ...EditorProps,
  id: string,
|};

function MultiplayerEditor(props: Props, ref: any) {
  const documentId = props.id;
  const currentUser = useCurrentUser();
  const { presence, ui } = useStores();
  const token = useCurrentToken();
  const [localProvider, setLocalProvider] = React.useState();
  const [remoteProvider, setRemoteProvider] = React.useState();
  const [ydoc] = React.useState(() => new Y.Doc());

  // Provider initialization must be within useLayoutEffect rather than useState
  // or useMemo as both of these are ran twice in React StrictMode resulting in
  // an orphaned websocket connection.
  // see: https://github.com/facebook/react/issues/20090#issuecomment-715926549
  React.useLayoutEffect(() => {
    const debug = env.ENVIRONMENT === "development";
    const name = `document.${documentId}`;

    const localProvider = new IndexeddbPersistence(name, ydoc);
    const provider = new HocuspocusProvider({
      url: env.MULTIPLAYER_URL,
      debug,
      name,
      document: ydoc,
      token,
    });

    provider.on("awarenessChange", ({ states }) => {
      states.forEach(({ user }) => {
        if (user) {
          // could know if the user is editing here using `state.cursor` but it
          // feels distracting in the UI, once multiplayer is on for everyone we
          // can stop diffentiating
          presence.touch(documentId, user.id, false);
        }
      });
    });

    // const handleSynced = () => {
    //   setRemoteSynced(true);
    //   provider.off("sync", handleSynced);
    // };

    // provider.on("sync", handleSynced);

    if (debug) {
      provider.on("status", (ev) => console.log("status", ev.status));
      provider.on("message", (ev) => console.log("incoming", ev.message));
      provider.on("outgoingMessage", (ev) =>
        console.log("outgoing", ev.message)
      );
      localProvider.on("synced", (ev) => console.log("local synced"));
    }

    provider.on("status", (ev) => ui.setMultiplayerStatus(ev.status));

    setRemoteProvider(provider);
    setLocalProvider(localProvider);
  }, [documentId, ui, presence, token, ydoc]);

  // const [showCachedDocument, setShowCachedDocument] = React.useState(true);
  // const [isRemoteSynced, setRemoteSynced] = React.useState(true);

  // React.useEffect(() => {
  //   if (isRemoteSynced) {
  //     setTimeout(() => setShowCachedDocument(false), 100);
  //   }
  // }, [isRemoteSynced]);

  const user = React.useMemo(() => {
    return {
      id: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
    };
  }, [currentUser.id, currentUser.color, currentUser.name]);

  const extensions = React.useMemo(() => {
    if (!remoteProvider) {
      return [];
    }

    return [
      new MultiplayerExtension({
        user,
        provider: remoteProvider,
        document: ydoc,
      }),
    ];
  }, [remoteProvider, user, ydoc]);

  useUnmount(() => {
    remoteProvider?.destroy();
    localProvider?.destroy();
    ui.setMultiplayerStatus(undefined);
  });

  return (
    <>
      {extensions.length ? (
        <Editor
          {...props}
          value={undefined}
          defaultValue={undefined}
          extensions={extensions}
          // style={style}
          ref={ref}
        />
      ) : undefined}
      {/* {showCachedDocument && <Editor {...props} readOnly />} */}
    </>
  );
}

export default React.forwardRef<any, typeof MultiplayerEditor>(
  MultiplayerEditor
);
