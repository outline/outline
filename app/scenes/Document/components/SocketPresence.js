// @flow
import * as React from "react";
import * as Y from "yjs";
import { SocketContext } from "components/SocketProvider";
import { WebsocketProvider } from "multiplayer/WebsocketProvider";

type Props = {
  children: ({
    provider: WebsocketProvider,
    isConnected: boolean,
    doc: Y.Doc,
  }) => React.Node,
  documentId: string,
  userId: string,
};

export default function SocketPresence(props: Props) {
  const context = React.useContext(SocketContext);
  const [isConnected, setConnected] = React.useState(context.connected);
  const [doc] = React.useState(() => new Y.Doc());
  const [provider] = React.useState(
    () => new WebsocketProvider(context, props.documentId, props.userId, doc)
  );

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

    context.on("connect", updateStatus);
    context.on("disconnect", updateStatus);

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
    };
  }, [context, props.documentId, props.userId]);

  return props.children({
    isConnected,
    provider,
    doc,
  });
}
