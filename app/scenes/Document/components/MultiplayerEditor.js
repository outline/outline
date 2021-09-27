// @flow
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import Editor, { type Props as EditorProps } from "components/Editor";
import PlaceholderDocument from "components/PlaceholderDocument";
import env from "env";
import useCurrentToken from "hooks/useCurrentToken";
import useCurrentUser from "hooks/useCurrentUser";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
import useUnmount from "hooks/useUnmount";
import MultiplayerExtension from "multiplayer/MultiplayerExtension";
import { homeUrl } from "utils/routeHelpers";

type Props = {|
  ...EditorProps,
  id: string,
|};

function MultiplayerEditor({ ...props }: Props, ref: any) {
  const documentId = props.id;
  const history = useHistory();
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const { presence, ui } = useStores();
  const token = useCurrentToken();
  const [localProvider, setLocalProvider] = React.useState();
  const [remoteProvider, setRemoteProvider] = React.useState();
  const [isLocalSynced, setLocalSynced] = React.useState(false);
  const [isRemoteSynced, setRemoteSynced] = React.useState(false);
  const [ydoc] = React.useState(() => new Y.Doc());
  const { showToast } = useToasts();

  // Provider initialization must be within useLayoutEffect rather than useState
  // or useMemo as both of these are ran twice in React StrictMode resulting in
  // an orphaned websocket connection.
  // see: https://github.com/facebook/react/issues/20090#issuecomment-715926549
  React.useLayoutEffect(() => {
    const debug = env.ENVIRONMENT === "development";
    const name = `document.${documentId}`;

    const localProvider = new IndexeddbPersistence(name, ydoc);
    const provider = new HocuspocusProvider({
      url: `${env.COLLABORATION_URL}/collaboration`,
      debug,
      name,
      document: ydoc,
      token,
      maxReconnectTimeout: 10000,
    });

    provider.on("authenticationFailed", () => {
      showToast(
        t(
          "Sorry, it looks like you don’t have permission to access the document"
        )
      );

      history.replace(homeUrl());
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

    localProvider.on("synced", () => setLocalSynced(true));
    provider.on("synced", () => setRemoteSynced(true));

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
  }, [history, showToast, t, documentId, ui, presence, token, ydoc]);

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

  if (!extensions.length) {
    return null;
  }

  if (isLocalSynced && !isRemoteSynced && !ydoc.get("default")._start) {
    return <PlaceholderDocument includeTitle={false} delay={500} />;
  }

  // while the collaborative document is loading, we render a version of the
  // document from the last text cache in read-only mode if we have it.
  const showCache = !isLocalSynced && !isRemoteSynced;

  return (
    <>
      {showCache && (
        <Editor defaultValue={props.defaultValue} readOnly ref={ref} />
      )}
      <Editor
        {...props}
        value={undefined}
        defaultValue={undefined}
        extensions={extensions}
        ref={showCache ? undefined : ref}
        style={showCache ? { display: "none" } : undefined}
      />
    </>
  );
}

export default React.forwardRef<any, typeof MultiplayerEditor>(
  MultiplayerEditor
);
