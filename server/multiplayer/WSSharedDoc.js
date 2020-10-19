// @flow
import * as encoding from "lib0/dist/encoding.cjs";
import * as mutex from "lib0/dist/mutex.cjs";
import * as awarenessProtocol from "y-protocols/dist/awareness.cjs";
import * as syncProtocol from "y-protocols/dist/sync.cjs";
import * as Y from "yjs";
import { MESSAGE_AWARENESS, MESSAGE_SYNC } from "../../shared/constants";

export default class WSSharedDoc extends Y.Doc {
  constructor(documentId: string, io: any) {
    super({ gc: true });
    this.io = io;
    this.documentId = documentId;
    this.mux = mutex.createMutex();
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    this.awareness.on("update", this.awarenessHandler);
    this.on("update", this.updateHandler);
  }

  destroy() {
    this.off("update", this.updateHandler);
    this.awareness.off("update", this.awarenessHandler);
    this.awareness.destroy();
    super.destroy();
  }

  awarenessHandler = (
    {
      added,
      updated,
      removed,
    }: { added: Array<number>, updated: Array<number>, removed: Array<number> },
    socketId: number
  ) => {
    const changedClients = added.concat(updated, removed);

    if (socketId !== null) {
      const connControlledIDs = this.conns.get(socketId);

      if (connControlledIDs !== undefined) {
        added.forEach((clientID) => {
          connControlledIDs.add(clientID);
        });
        removed.forEach((clientID) => {
          connControlledIDs.delete(clientID);
        });
      }
    }

    // broadcast awareness update
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
    );
    const data = encoding.toUint8Array(encoder);

    this.io
      .to(`document-${this.documentId}`)
      .binary(true)
      .emit("document.sync", {
        documentId: this.documentId,
        data,
      });
  };

  updateHandler = (update: Uint8Array, origin: any) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const data = encoding.toUint8Array(encoder);

    this.io
      .to(`document-${this.documentId}`)
      .binary(true)
      .emit("document.sync", {
        documentId: this.documentId,
        data,
      });
  };
}
