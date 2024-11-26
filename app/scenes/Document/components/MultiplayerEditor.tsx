import { HocuspocusProvider, WebSocketStatus } from "@hocuspocus/provider";
import throttle from "lodash/throttle";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { supportsPassiveListener } from "@shared/utils/browser";
import Editor, { Props as EditorProps } from "~/components/Editor";
import MultiplayerExtension from "~/editor/extensions/Multiplayer";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useIdle from "~/hooks/useIdle";
import useIsMounted from "~/hooks/useIsMounted";
import usePageVisibility from "~/hooks/usePageVisibility";
import useStores from "~/hooks/useStores";
import { AwarenessChangeEvent } from "~/types";
import Logger from "~/utils/Logger";
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

type ConnectionStatusEvent = { status: ConnectionStatus };

type MessageEvent = {
  message: string;
  event: Event & {
    code?: number;
  };
};

function MultiplayerEditor({ onSynced, ...props }: Props, ref: any) {
  const documentId = props.id;
  const history = useHistory();
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const { presence, auth, ui } = useStores();
  const [showCursorNames, setShowCursorNames] = React.useState(false);
  const [remoteProvider, setRemoteProvider] =
    React.useState<HocuspocusProvider | null>(null);
  const [isLocalSynced, setLocalSynced] = React.useState(false);
  const [isRemoteSynced, setRemoteSynced] = React.useState(false);
  const [ydoc] = React.useState(() => new Y.Doc());
  const token = auth.collaborationToken;
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
      void auth.fetchAuth().catch(() => {
        history.replace(homePath());
      });
    });

    provider.on("awarenessChange", (event: AwarenessChangeEvent) => {
      presence.updateFromAwarenessChangeEvent(documentId, event);

      event.states.forEach(({ user, scrollY }) => {
        if (user) {
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

    provider.on("close", (ev: MessageEvent) => {
      if ("code" in ev.event) {
        provider.shouldConnect =
          ev.event.code !== 1009 && ev.event.code !== 4401;
        ui.setMultiplayerStatus("disconnected", ev.event.code);
      }
    });

    if (debug) {
      provider.on("close", (ev: MessageEvent) =>
        Logger.debug("collaboration", "close", ev)
      );
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

    provider.on("status", (ev: ConnectionStatusEvent) => {
      if (ui.multiplayerStatus !== ev.status) {
        ui.setMultiplayerStatus(ev.status, undefined);
      }
    });

    setRemoteProvider(provider);

    return () => {
      window.removeEventListener("click", finishObserving);
      window.removeEventListener("wheel", finishObserving);
      window.removeEventListener("scroll", syncScrollPosition);
      provider?.destroy();
      void localProvider?.destroy();
      setRemoteProvider(null);
      ui.setMultiplayerStatus(undefined, undefined);
    };
  }, [
    history,
    t,
    documentId,
    ui,
    presence,
    ydoc,
    token,
    currentUser.id,
    isMounted,
    auth,
  ]);

  const user = React.useMemo(
    () => ({
      id: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
    }),
    [currentUser.id, currentUser.color, currentUser.name]
  );

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
      void onSynced?.();
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
      void remoteProvider.disconnect();
    }

    if (
      (!isIdle || isVisible) &&
      remoteProvider.status === WebSocketStatus.Disconnected
    ) {
      void remoteProvider.connect();
    }
  }, [remoteProvider, isIdle, isVisible]);

  // Certain emoji combinations trigger this error in YJS, while waiting for a fix
  // we must prevent the user from continuing to edit as their changes will not
  // be persisted. See: https://github.com/yjs/yjs/issues/303
  React.useEffect(() => {
    function onUnhandledError(event: ErrorEvent) {
      if (event.message.includes("URIError: URI malformed")) {
        toast.error(
          t(
            "Sorry, the last change could not be persisted – please reload the page"
          )
        );
      }
    }

    window.addEventListener("error", onUnhandledError);
    return () => window.removeEventListener("error", onUnhandledError);
  }, [t]);

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
          editorStyle={props.editorStyle}
          embedsDisabled={props.embedsDisabled}
          defaultValue={props.defaultValue}
          extensions={props.extensions}
          scrollTo={props.scrollTo}
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
                height: 0,
                opacity: 0,
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
