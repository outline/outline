// @flow
import { yDocToProsemirror } from "@tommoor/y-prosemirror";
import debug from "debug";
import * as decoding from "lib0/dist/decoding.cjs";
import * as encoding from "lib0/dist/encoding.cjs";
import { uniq, debounce } from "lodash";
import { schema, serializer } from "rich-markdown-editor";
import { Socket } from "socket.io-client";
import * as awarenessProtocol from "y-protocols/dist/awareness.cjs";
import * as syncProtocol from "y-protocols/dist/sync.cjs";
import * as Y from "yjs";
import { MESSAGE_AWARENESS, MESSAGE_SYNC } from "../../shared/constants";
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
        async (update) => {
          log(`persisting doc (${documentId}) to database`);

          // TODO: refactor this persistence out
          Y.applyUpdate(doc, update);
          const state = Y.encodeStateAsUpdate(doc);
          const node = yDocToProsemirror(schema, doc);
          const text = serializer.serialize(node);

          // TODO: Refactor to helper, PR against yjs
          const pud = new Y.PermanentUserData(doc);
          let collaboratorIds = document.collaboratorIds;
          for (const [userId] of pud.dss.entries()) {
            collaboratorIds.push(userId);
          }
          for (const entry of pud.clients.entries()) {
            collaboratorIds.push(entry[1]);
          }
          collaboratorIds = uniq(collaboratorIds);

          await Document.update(
            {
              text,
              state: Buffer.from(state),
              updatedAt: new Date(),
              collaboratorIds,
            },
            {
              hooks: false,
              where: {
                id: documentId,
              },
            }
          );

          // TODO: Refactor out
          const event = await Event.build({
            name: "documents.update",
            documentId: document.id,
            collectionId: document.collectionId,
            teamId: document.teamId,
            data: {
              multiplayer: true,
              title: document.title,
            },
          });
          event.addToQueue();
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

export async function handleLeave(socketId: string, documentId: string) {
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
    // TODO: write a revision

    // TODO: refactor persistence to document model
    const state = Y.encodeStateAsUpdate(doc);
    await Document.update(
      {
        state: Buffer.from(state),
        updatedAt: new Date(),
      },
      {
        hooks: false,
        where: {
          id: doc.documentId,
        },
      }
    );

    doc.destroy();
    docs.delete(doc.documentId);
  }
}

export function handleSync(
  socket: Socket,
  documentId: string,
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
      syncProtocol.readSyncMessage(decoder, encoder, doc, null);
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
      syncProtocol.readSyncMessage(decoder, encoder, doc, null);
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
