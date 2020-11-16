// @flow
import * as React from "react";
import * as Y from "yjs";
import { SocketContext } from "components/SocketProvider";
import useStores from "hooks/useStores";
import { WebsocketProvider } from "multiplayer/WebsocketProvider";

type Props = {
  children: ({
    provider: ?WebsocketProvider,
    isReconnecting: boolean,
    isConnected: boolean,
    doc: Y.Doc,
  }) => React.Node,
  isMultiplayer: boolean,
  documentId: string,
  userId?: string,
};

export default function SocketPresence(props: Props) {
  const { presence } = useStores();
  const context = React.useContext(SocketContext);
  const [isConnected, setConnected] = React.useState(
    context ? context.connected : false
  );
  const [isReconnecting, setReconnecting] = React.useState(false);
  const [doc] = React.useState(() =>
    props.isMultiplayer ? new Y.Doc() : undefined
  );
  const [provider] = React.useState(() =>
    props.isMultiplayer && props.userId
      ? new WebsocketProvider(context, props.documentId, props.userId, doc)
      : undefined
  );

  React.useEffect(() => {
    provider.awareness.on("update", () => {
      presence.updateFromAwareness(props.documentId, provider.awareness);
    });
  }, [provider.awareness]);

  React.useEffect(() => {
    console.log("useEffect", context);
    if (!context) return;

    const emitJoin = () => {
      if (!context) return;
      context.emit("join", { documentId: props.documentId });
    };

    const updateStatus = () => {
      setConnected(context.connected);
    };

    const reconnectingStopped = () => {
      setReconnecting(false);
    };

    context.on("connect", updateStatus);
    context.on("disconnect", updateStatus);
    context.on("reconnect", reconnectingStopped);
    context.on("reconnect_attempt", setReconnecting);
    context.on("reconnect_failed", reconnectingStopped);

    context.on("authenticated", () => {
      emitJoin();
    });

    if (context.authenticated) {
      emitJoin();
    }

    return () => {
      if (!context) return;
      context.emit("leave", { documentId: props.documentId });
      context.off("authenticated", emitJoin);
      context.off("connect", updateStatus);
      context.off("disconnect", updateStatus);
      context.off("reconnect", reconnectingStopped);
      context.off("reconnect_attempt", setReconnecting);
      context.off("reconnect_failed", reconnectingStopped);
    };
  }, [context, props.documentId, props.userId]);

  return props.children({
    isConnected,
    isReconnecting,
    provider,
    doc,
  });
}
