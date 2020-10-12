// @flow
import * as encoding from "lib0/dist/encoding.cjs";
import * as mutex from "lib0/dist/mutex.cjs";
import * as awarenessProtocol from "y-protocols/dist/awareness.cjs";
import * as syncProtocol from "y-protocols/dist/sync.cjs";
import * as Y from "yjs";
import { MESSAGE_AWARENESS, MESSAGE_SYNC } from "../../shared/constants";

export default class WSSharedDoc extends Y.Doc {
  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.mux = mutex.createMutex();
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    this.awareness.on("update", ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs = /** @type {Set<number>} */ (this.conns.get(
          conn
        ));
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
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, conn) => {
        conn.binary(true).emit("user.presence", {
          documentId: this.name,
          data: buff,
        });
      });
    });

    this.on("update", (update, origin, doc) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const buff = encoding.toUint8Array(encoder);

      doc.conns.forEach((_, conn) =>
        conn.binary(true).emit("user.presence", {
          documentId: this.name,
          data: buff,
        })
      );
    });
  }
}
