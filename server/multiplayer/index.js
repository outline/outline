// @flow
import debug from "debug";
import * as decoding from "lib0/dist/decoding.cjs";
import * as encoding from "lib0/dist/encoding.cjs";
import { debounce } from "lodash";
import { Socket } from "socket.io-client";
import * as awarenessProtocol from "y-protocols/dist/awareness.cjs";
import * as syncProtocol from "y-protocols/dist/sync.cjs";
import * as Y from "yjs";
import { MESSAGE_AWARENESS, MESSAGE_SYNC } from "../../shared/constants";
import documentUpdater from "../commands/documentUpdater";
import { Document } from "../models";
import WSSharedDoc from "./WSSharedDoc";

const log = debug("multiplayer");
const docs = new Map<string, WSSharedDoc>();
const PERSIST_WAIT = 3000;

export function handleJoin({
  io,
  socket,
  document,
  documentId,
}: {
  io: any,
  socket: Socket,
  document: Document,
  documentId: string,
}) {
  log(`socket ${socket.id} is joining ${documentId}`);
  let doc = docs.get(documentId);

  if (!doc) {
    doc = new WSSharedDoc(document, io);
    doc.get("prosemirror", Y.XmlFragment);

    if (document.state) {
      log(`no existing session for ${documentId} – using database state`);
      Y.applyUpdate(doc, document.state);
    } else {
      log(`no existing session for ${documentId} – no database state`);
    }

    doc.on(
      "update",
      debounce(
        async (update, origin: { userId: string, remote?: boolean }) => {
          // If the origin is "remote" this means that the transaction came from
          // a remote server process, as we're just accepting transactions to
          // keep us in sync with another doc there is no need to persist.
          if (origin.remote) {
            return;
          }

          log(`persisting doc (${documentId}) to database`);
          await documentUpdater({
            documentId,
            ydoc: doc,
            userId: origin.userId,
          });
        },
        PERSIST_WAIT,
        {
          maxWait: PERSIST_WAIT * 3,
        }
      )
    );

    docs.set(documentId, doc);
  }

  doc.conns.set(socket.id, new Set());

  // send sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);

  socket.binary(true).emit("document.sync", {
    documentId,
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

    socket.binary(true).emit("document.sync", {
      documentId,
      data: encoding.toUint8Array(encoder),
    });
  }
}

export async function handleLeave(
  socketId: string,
  userId: string,
  documentId: string
) {
  let doc = docs.get(documentId);

  // this method is called for all leave events, even old-style, so it needs
  // to handle attempting to leave when there is no existing connection
  if (!doc || !doc.conns.has(socketId)) {
    return;
  }

  // remove ourselves from the awareness state
  const controlledIds = doc.conns.get(socketId);
  doc.conns.delete(socketId);
  awarenessProtocol.removeAwarenessStates(
    doc.awareness,
    Array.from(controlledIds),
    null
  );

  // last client has left this document connection, time to cleanup and ensure
  // we've written the latest state to the database.

  // Important note: In multi-server setups this can mean that everyone has left
  // on an individual server process, however their may still be other clients
  // connected to other processes
  // TODO: store connections in redis?
  if (doc.conns.size === 0) {
    log(`all clients left doc (${documentId}), persisting…`);
    await documentUpdater({ documentId, ydoc: doc, userId, done: true });

    doc.destroy();
    docs.delete(documentId);
  }
}

export function handleSync(
  socket: Socket,
  documentId: string,
  userId: string,
  message: Uint8Array
) {
  // check auth with existence of socketId in set
  let doc = docs.get(documentId);
  if (!doc) {
    log(`received sync message but doc (${documentId}) not yet loaded`);
    return;
  }

  if (!doc.conns.get(socket.id)) {
    log(
      `received sync message but socket (${socket.id}) has not joined doc (${documentId})`
    );
    return;
  }

  const encoder = encoding.createEncoder();
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MESSAGE_SYNC: {
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, doc, { userId });
      if (encoding.length(encoder) > 1) {
        socket.binary(true).emit("document.sync", {
          documentId,
          data: encoding.toUint8Array(encoder),
        });
      }
      break;
    }
    case MESSAGE_AWARENESS: {
      awarenessProtocol.applyAwarenessUpdate(
        doc.awareness,
        decoding.readVarUint8Array(decoder),
        socket.id
      );
      break;
    }
    default:
  }
}

export function handleRemoteSync(
  socketId: string,
  documentId: string,
  userId: string,
  data: {
    type: string,
    data: ArrayBuffer,
  }
) {
  let doc = docs.get(documentId);
  if (!doc) {
    if (process.env.NODE_ENV === "development") {
      log(`received remote sync message but doc (${documentId}) not loaded`);
    }
    return;
  }

  if (!doc.conns.get(socketId)) {
    if (process.env.NODE_ENV === "development") {
      log(
        `received remote sync message but socket (${socketId}) has not joined doc (${documentId})`
      );
    }
    return;
  }

  // Note: This is different to handleSync – parsing moved to here so that we
  // can avoid conversion steps if the doc doesn't already exist in memory.
  const message = new Uint8Array(Buffer.from(data.data));
  const encoder = encoding.createEncoder();
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MESSAGE_SYNC: {
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, doc, {
        userId,
        remote: true,
      });
      break;
    }
    case MESSAGE_AWARENESS: {
      awarenessProtocol.applyAwarenessUpdate(
        doc.awareness,
        decoding.readVarUint8Array(decoder),
        socketId
      );
      break;
    }
    default:
  }
}
