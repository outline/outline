import { HocuspocusProvider, WebSocketStatus } from "@hocuspocus/provider";
import { throttle } from "lodash";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import Editor, { Props as EditorProps } from "~/components/Editor";
import env from "~/env";
import useCurrentToken from "~/hooks/useCurrentToken";
import useCurrentUser from "~/hooks/useCurrentUser";
import useIdle from "~/hooks/useIdle";
import useIsMounted from "~/hooks/useIsMounted";
import usePageVisibility from "~/hooks/usePageVisibility";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import MultiplayerExtension from "~/multiplayer/MultiplayerExtension";
import Logger from "~/utils/Logger";
import { supportsPassiveListener } from "~/utils/browser";
import { homePath } from "~/utils/routeHelpers";

type Props = EditorProps & {
  id: string;
  onSynced?: () => Promise<void>;
};

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | void;

type AwarenessChangeEvent = {
  states: { user: { id: string }; cursor: any; scrollY: number | undefined }[];
};

type ConnectionStatusEvent = { status: ConnectionStatus };

type MessageEvent = { message: string };

function MultiplayerEditor({ onSynced, ...props }: Props, ref: any) {
  const documentId = props.id;
  const history = useHistory();
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const { presence, ui } = useStores();
  const token = useCurrentToken();
  const [showCursorNames, setShowCursorNames] = React.useState(false);
  const [
    remoteProvider,
    setRemoteProvider,
  ] = React.useState<HocuspocusProvider | null>(null);
  const [isLocalSynced, setLocalSynced] = React.useState(false);
  const [isRemoteSynced, setRemoteSynced] = React.useState(false);
  const [ydoc] = React.useState(() => new Y.Doc());
  const { showToast } = useToasts();
  const isIdle = useIdle();
  const isVisible = usePageVisibility();
  const isMounted = useIsMounted();

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
      name,
      document: ydoc,
      token,
    });

    const syncScrollPosition = throttle(() => {
      provider.setAwarenessField(
        "scrollY",
        window.scrollY / window.innerHeight
      );
    }, 250);

    const finishObserving = () => {
      if (ui.observingUserId) {
        ui.setObservingUser(undefined);
      }
    };

    window.addEventListener("click", finishObserving);
    window.addEventListener("wheel", finishObserving);
    window.addEventListener(
      "scroll",
      syncScrollPosition,
      supportsPassiveListener ? { passive: true } : false
    );

    provider.on("authenticationFailed", () => {
      showToast(
        t(
          "Sorry, it looks like you don’t have permission to access the document"
        )
      );
      history.replace(homePath());
    });

    provider.on("awarenessChange", ({ states }: AwarenessChangeEvent) => {
      states.forEach(({ user, cursor, scrollY }) => {
        if (user) {
          presence.touch(documentId, user.id, !!cursor);

          if (scrollY !== undefined && user.id === ui.observingUserId) {
            window.scrollTo({
              top: scrollY * window.innerHeight,
              behavior: "smooth",
            });
          }
        }
      });
    });

    const showCursorNames = () => {
      setShowCursorNames(true);
      setTimeout(() => {
        if (isMounted()) {
          setShowCursorNames(false);
        }
      }, 2000);
      provider.off("awarenessChange", showCursorNames);
    };

    provider.on("awarenessChange", showCursorNames);
    localProvider.on("synced", () =>
      // only set local storage to "synced" if it's loaded a non-empty doc
      setLocalSynced(!!ydoc.get("default")._start)
    );
    provider.on("synced", () => {
      presence.touch(documentId, currentUser.id, false);
      setRemoteSynced(true);
    });

    if (debug) {
      provider.on("message", (ev: MessageEvent) =>
        Logger.debug("collaboration", "incoming", {
          message: ev.message,
        })
      );
      provider.on("outgoingMessage", (ev: MessageEvent) =>
        Logger.debug("collaboration", "outgoing", {
          message: ev.message,
        })
      );
      localProvider.on("synced", () =>
        Logger.debug("collaboration", "local synced")
      );
    }

    provider.on("status", (ev: ConnectionStatusEvent) =>
      ui.setMultiplayerStatus(ev.status)
    );

    setRemoteProvider(provider);

    return () => {
      window.removeEventListener("click", finishObserving);
      window.removeEventListener("wheel", finishObserving);
      window.removeEventListener("scroll", syncScrollPosition);
      provider?.destroy();
      localProvider?.destroy();
      setRemoteProvider(null);
      ui.setMultiplayerStatus(undefined);
    };
  }, [
    history,
    showToast,
    t,
    documentId,
    ui,
    presence,
    token,
    ydoc,
    currentUser.id,
    isMounted,
  ]);

  const user = React.useMemo(() => {
    return {
      id: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
    };
  }, [currentUser.id, currentUser.color, currentUser.name]);

  const extensions = React.useMemo(() => {
    if (!remoteProvider) {
      return props.extensions;
    }

    return [
      ...(props.extensions || []),
      new MultiplayerExtension({
        user,
        provider: remoteProvider,
        document: ydoc,
      }),
    ];
  }, [remoteProvider, user, ydoc, props.extensions]);

  React.useEffect(() => {
    if (isLocalSynced && isRemoteSynced) {
      onSynced?.();
    }
  }, [onSynced, isLocalSynced, isRemoteSynced]);

  // Disconnect the realtime connection while idle. `isIdle` also checks for
  // page visibility and will immediately disconnect when a tab is hidden.
  React.useEffect(() => {
    if (!remoteProvider) {
      return;
    }

    if (
      isIdle &&
      !isVisible &&
      remoteProvider.status === WebSocketStatus.Connected
    ) {
      remoteProvider.disconnect();
    }

    if (
      (!isIdle || isVisible) &&
      remoteProvider.status === WebSocketStatus.Disconnected
    ) {
      remoteProvider.connect();
    }
  }, [remoteProvider, isIdle, isVisible]);

  // Certain emoji combinations trigger this error in YJS, while waiting for a fix
  // we must prevent the user from continuing to edit as their changes will not
  // be persisted. See: https://github.com/yjs/yjs/issues/303
  React.useEffect(() => {
    function onUnhandledError(event: ErrorEvent) {
      if (event.message.includes("URIError: URI malformed")) {
        showToast(
          t(
            "Sorry, the last change could not be persisted – please reload the page"
          ),
          {
            type: "error",
            timeout: 0,
          }
        );
      }
    }

    window.addEventListener("error", onUnhandledError);
    return () => window.removeEventListener("error", onUnhandledError);
  }, [showToast, t]);

  if (!remoteProvider) {
    return null;
  }

  // while the collaborative document is loading, we render a version of the
  // document from the last text cache in read-only mode if we have it.
  const showCache = !isLocalSynced && !isRemoteSynced;

  return (
    <>
      {showCache && (
        <Editor
          defaultValue={props.defaultValue}
          extensions={props.extensions}
          readOnly
          ref={ref}
        />
      )}
      <Editor
        {...props}
        value={undefined}
        defaultValue={undefined}
        extensions={extensions}
        ref={showCache ? undefined : ref}
        style={
          showCache
            ? {
                display: "none",
              }
            : undefined
        }
        className={showCursorNames ? "show-cursor-names" : undefined}
      />
    </>
  );
}

export default React.forwardRef<typeof MultiplayerEditor, Props>(
  MultiplayerEditor
);
