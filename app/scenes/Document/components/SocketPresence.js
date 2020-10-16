// @flow
import * as React from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { SocketContext } from "components/SocketProvider";
import { WebsocketProvider } from "multiplayer/websocket";

type Props = {
  children: (any) => React.Node,
  documentId: string,
  userId: string,
};

export default function SocketPresence(props: Props) {
  const context = React.useContext(SocketContext);
  const [doc] = React.useState(() => new Y.Doc());
  const [provider] = React.useState(
    () => new WebsocketProvider(context, props.documentId, props.userId, doc)
  );
  const [dbProvider] = React.useState(
    () => new IndexeddbPersistence(props.documentId, doc)
  );

  React.useEffect(() => {
    if (!context) return;

    const emitJoin = () => {
      if (!context) return;
      context.emit("join", { documentId: props.documentId });
    };

    context.on("user.join", (message) => {
      if (message.userId === props.userId) {
        console.log("we joined");
      }
    });

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
    };
  }, [context, props.documentId, props.userId]);

  return props.children({
    dbProvider,
    provider,
    doc,
  });
}
