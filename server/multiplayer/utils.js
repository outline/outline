// @flow
import * as decoding from "lib0/dist/decoding.cjs";
import * as encoding from "lib0/dist/encoding.cjs";
import * as awarenessProtocol from "y-protocols/dist/awareness.cjs";
import * as syncProtocol from "y-protocols/dist/sync.cjs";
import { MESSAGE_AWARENESS, MESSAGE_SYNC } from "../../shared/constants";
import WSSharedDoc from "./WSSharedDoc";

const docs = new Map();

const messageListener = (conn, doc, message) => {
  const encoder = encoding.createEncoder();
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  console.log("messageListener", message);

  switch (messageType) {
    case MESSAGE_SYNC:
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, doc, null);
      if (encoding.length(encoder) > 1) {
        conn.binary(true).emit({
          documentId: doc.name,
          data: encoding.toUint8Array(encoder),
        });
      }
      break;
    case MESSAGE_AWARENESS: {
      awarenessProtocol.applyAwarenessUpdate(
        doc.awareness,
        decoding.readVarUint8Array(decoder),
        conn
      );
      break;
    }
    default:
  }
};

const cleanup = (doc, conn) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);

    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds),
      null
    );

    // last person has left this editing session
    if (doc.conns.size === 0) {
      // TODO: Write document state to database
      doc.destroy();
      docs.delete(doc.name);
    }
  }
};

export const setupConnection = (conn, documentId: string) => {
  console.log("setupConnection");

  let doc: ?WSSharedDoc = docs.get(documentId);

  if (!doc) {
    console.log("creating doc");
    doc = new WSSharedDoc(documentId);

    // TODO: Grab state from database

    docs.set(documentId, doc);
  }

  doc.conns.set(conn, new Set());

  // listen and reply to events
  conn.on("presence", (event) =>
    messageListener(conn, doc, new Uint8Array(event.data))
  );

  conn.on("close", cleanup);

  // send sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);

  conn.binary(true).emit("user.presence", {
    documentId: doc.name,
    data: encoding.toUint8Array(encoder),
  });

  const awarenessStates = doc.awareness.getStates();

  if (awarenessStates.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        doc.awareness,
        Array.from(awarenessStates.keys())
      )
    );

    conn.binary(true).emit("user.presence", {
      documentId: doc.name,
      data: encoding.toUint8Array(encoder),
    });
  }
};
