// Based on example implementation, modified to work with existing sockets
// https://github.com/yjs/y-websocket/blob/master/src/y-websocket.js

// @flow
import * as bc from "lib0/broadcastchannel.js";
import * as decoding from "lib0/decoding.js";
import * as encoding from "lib0/encoding.js";
import * as mutex from "lib0/mutex.js";
import { Observable } from "lib0/observable.js";
import { Socket } from "socket.io-client";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as syncProtocol from "y-protocols/sync.js";
import * as Y from "yjs";
import {
  MESSAGE_SYNC,
  MESSAGE_AWARENESS,
  MESSAGE_QUERY_AWARENESS,
} from "shared/constants";

const readMessage = (
  provider: WebsocketProvider,
  buff: Uint8Array,
  emitSynced: boolean
): encoding.Encoder => {
  const decoder = decoding.createDecoder(buff);
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MESSAGE_SYNC: {
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      const syncMessageType = syncProtocol.readSyncMessage(
        decoder,
        encoder,
        provider.doc,
        provider
      );
      if (
        emitSynced &&
        syncMessageType === syncProtocol.messageYjsSyncStep2 &&
        !provider.synced
      ) {
        provider.synced = true;
      }
      break;
    }
    case MESSAGE_QUERY_AWARENESS:
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          provider.awareness,
          Array.from(provider.awareness.getStates().keys())
        )
      );
      break;
    case MESSAGE_AWARENESS:
      awarenessProtocol.applyAwarenessUpdate(
        provider.awareness,
        decoding.readVarUint8Array(decoder),
        provider
      );
      break;
    default:
      console.error("Unable to compute message");
      return encoder;
  }
  return encoder;
};

const broadcastMessage = (provider: WebsocketProvider, buff: ArrayBuffer) => {
  if (provider.wsconnected) {
    provider.ws.send(buff);
  }
  if (provider.bcconnected) {
    provider.mux(() => {
      bc.publish(provider.url, buff);
    });
  }
};

const setupWebsocket = (provider) => {
  if (provider.shouldConnect && provider.ws === null) {
    provider.ws = {
      send: (buff) => {
        if (!buff) return;

        provider.socket.binary(true).emit("document.sync", {
          documentId: provider.documentId,
          userId: provider.userId,
          data: buff,
        });
      },
    };

    provider.socket.on("document.sync", (event) => {
      const encoder = readMessage(provider, new Uint8Array(event.data), true);
      if (encoding.length(encoder) > 1) {
        provider.ws.send(encoding.toUint8Array(encoder));
      }
    });

    provider.socket.on("close", () => {
      awarenessProtocol.removeAwarenessStates(
        provider.awareness,
        Array.from(provider.awareness.getStates().keys()),
        provider
      );

      provider.emit("status", [
        {
          status: "disconnected",
        },
      ]);
    });

    provider.socket.on("user.join", (message) => {
      if (message.userId !== provider.userId) {
        return;
      }
      console.log("we joined");

      provider.emit("status", [
        {
          status: "connected",
        },
      ]);

      // always send sync step 1 when connected
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(encoder, provider.doc);
      provider.ws.send(encoding.toUint8Array(encoder));

      // broadcast local awareness state
      if (provider.awareness.getLocalState() !== null) {
        const encoderAwarenessState = encoding.createEncoder();
        encoding.writeVarUint(encoderAwarenessState, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoderAwarenessState,
          awarenessProtocol.encodeAwarenessUpdate(provider.awareness, [
            provider.doc.clientID,
          ])
        );

        provider.ws.send(encoding.toUint8Array(encoderAwarenessState));
      }
    });
  }
};

/**
 * Websocket Provider for Yjs. Syncs the shared document using socket.io socket
 */
export class WebsocketProvider extends Observable {
  constructor(
    socket: Socket,
    documentId: string,
    userId: string,
    doc: Y.Doc,
    {
      connect = true,
      awareness = new awarenessProtocol.Awareness(doc),
      resyncInterval = 30 * 1000,
    }: {
      connect: boolean,
      awareness: awarenessProtocol.Awareness,
      resyncInterval: number,
    } = {}
  ) {
    super();
    this.socket = socket;
    this.bcChannel = documentId;
    this.documentId = documentId;
    this.userId = userId;
    this.doc = doc;
    this._localAwarenessState = {};
    this.awareness = awareness;
    this.wsconnected = false;
    this.bcconnected = false;
    this.mux = mutex.createMutex();
    this._synced = false;
    this.ws = null;
    /**
     * Whether to connect to other peers or not
     * @type {boolean}
     */
    this.shouldConnect = connect;

    /**
     * @type {NodeJS.Timeout | number}
     */
    this._resyncInterval = 0;
    if (resyncInterval > 0) {
      this._resyncInterval = setInterval(() => {
        if (this.ws) {
          // resend sync step 1
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.writeSyncStep1(encoder, doc);
          this.ws.send(encoding.toUint8Array(encoder));
        }
      }, resyncInterval);
    }

    /**
     * @param {ArrayBuffer} data
     */
    this._bcSubscriber = (data) => {
      this.mux(() => {
        const encoder = readMessage(this, new Uint8Array(data), false);
        if (encoding.length(encoder) > 1) {
          bc.publish(this.bcChannel, encoding.toUint8Array(encoder));
        }
      });
    };
    /**
     * Listens to Yjs updates and sends them to remote peers (ws and broadcastchannel)
     * @param {Uint8Array} update
     * @param {any} origin
     */
    this._updateHandler = (update, origin) => {
      if (origin !== this || origin === null) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.writeUpdate(encoder, update);
        broadcastMessage(this, encoding.toUint8Array(encoder));
      }
    };
    this.doc.on("update", this._updateHandler);
    /**
     * @param {any} changed
     * @param {any} origin
     */
    this._awarenessUpdateHandler = ({ added, updated, removed }, origin) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      broadcastMessage(this, encoding.toUint8Array(encoder));
    };
    window.addEventListener("beforeunload", () => {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        [doc.clientID],
        "window unload"
      );
    });
    awareness.on("update", this._awarenessUpdateHandler);

    if (connect) {
      this.connect();
    }
  }

  get synced() {
    return this._synced;
  }

  set synced(state: boolean) {
    if (this._synced !== state) {
      this._synced = state;
      this.emit("sync", [state]);
    }
  }

  destroy() {
    if (this._resyncInterval !== 0) {
      clearInterval(this._resyncInterval);
    }
    this.disconnect();
    this.awareness.off("update", this._awarenessUpdateHandler);
    this.doc.off("update", this._updateHandler);
    super.destroy();
  }

  connectBc() {
    if (!this.bcconnected) {
      bc.subscribe(this.bcChannel, this._bcSubscriber);
      this.bcconnected = true;
    }

    // send sync step1 to bc
    this.mux(() => {
      // write sync step 1
      const encoderSync = encoding.createEncoder();
      encoding.writeVarUint(encoderSync, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(encoderSync, this.doc);
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderSync));

      // broadcast local state
      const encoderState = encoding.createEncoder();
      encoding.writeVarUint(encoderState, MESSAGE_SYNC);
      syncProtocol.writeSyncStep2(encoderState, this.doc);
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderState));

      // write queryAwareness
      const encoderAwarenessQuery = encoding.createEncoder();
      encoding.writeVarUint(encoderAwarenessQuery, MESSAGE_QUERY_AWARENESS);
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderAwarenessQuery));

      // broadcast local awareness state
      const encoderAwarenessState = encoding.createEncoder();
      encoding.writeVarUint(encoderAwarenessState, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoderAwarenessState,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
          this.doc.clientID,
        ])
      );
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderAwarenessState));
    });
  }

  disconnectBc() {
    // broadcast message with local awareness state set to null (indicating disconnect)
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        this.awareness,
        [this.doc.clientID],
        new Map()
      )
    );
    broadcastMessage(this, encoding.toUint8Array(encoder));
    if (this.bcconnected) {
      bc.unsubscribe(this.bcChannel, this._bcSubscriber);
      this.bcconnected = false;
    }
  }

  disconnect() {
    this.shouldConnect = false;
    this.disconnectBc();
    if (this.ws !== null) {
      this.ws.close();
    }
  }

  connect() {
    this.shouldConnect = true;
    if (!this.wsconnected && this.ws === null) {
      this.wsconnected = true;
      setupWebsocket(this);
      this.connectBc();
    }
  }
}
