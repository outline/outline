// Based on example implementation, modified to work with existing sockets
// https://github.com/yjs/y-websocket/blob/master/src/y-websocket.js

// @flow
import * as bc from "lib0/broadcastchannel.js";
import * as decoding from "lib0/decoding.js";
import * as encoding from "lib0/encoding.js";
import * as mutex from "lib0/mutex.js";
import { Observable } from "lib0/observable.js";
import * as time from "lib0/time.js";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as syncProtocol from "y-protocols/sync.js";
import * as Y from "yjs";
import {
  MESSAGE_SYNC,
  MESSAGE_AWARENESS,
  MESSAGE_QUERY_AWARENESS,
} from "shared/constants";

const messageSync = MESSAGE_SYNC;
const messageQueryAwareness = MESSAGE_QUERY_AWARENESS;
const messageAwareness = MESSAGE_AWARENESS;

/**
 * @param {WebsocketProvider} provider
 * @param {Uint8Array} buf
 * @param {boolean} emitSynced
 * @return {encoding.Encoder}
 */
const readMessage = (provider, buf, emitSynced) => {
  const decoder = decoding.createDecoder(buf);
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case messageSync: {
      encoding.writeVarUint(encoder, messageSync);
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
    case messageQueryAwareness:
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          provider.awareness,
          Array.from(provider.awareness.getStates().keys())
        )
      );
      break;
    case messageAwareness:
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

/**
 * @param {WebsocketProvider} provider
 * @param {ArrayBuffer} buf
 */
const broadcastMessage = (provider, buf) => {
  if (provider.wsconnected) {
    // @ts-ignore We know that wsconnected = true
    provider.ws.send(buf);
  }
  if (provider.bcconnected) {
    provider.mux(() => {
      bc.publish(provider.url, buf);
    });
  }
};

const setupWS = (provider) => {
  if (provider.shouldConnect && provider.ws === null) {
    provider.ws = {
      send: (buff) => {
        if (!buff) return;

        provider.socket.binary(true).emit("presence", {
          documentId: provider.documentId,
          userId: provider.userId,
          data: buff,
        });
      },
    };

    provider.socket.on("user.presence", (event) => {
      provider.wsLastMessageReceived = time.getUnixTime();
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
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeSyncStep1(encoder, provider.doc);
      provider.ws.send(encoding.toUint8Array(encoder));

      // broadcast local awareness state
      if (provider.awareness.getLocalState() !== null) {
        const encoderAwarenessState = encoding.createEncoder();
        encoding.writeVarUint(encoderAwarenessState, messageAwareness);
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
 * Websocket Provider for Yjs. Creates a websocket connection to sync the shared document.
 *
 * @example
 *   const doc = new Y.Doc()
 *   const provider = new WebsocketProvider(socket, documentId, doc)
 *
 * @extends {Observable<string>}
 */
export class WebsocketProvider extends Observable {
  /**
   * @param {string} serverUrl
   * @param {string} documentId
   * @param {Y.Doc} doc
   * @param {object} [opts]
   * @param {boolean} [opts.connect]
   * @param {awarenessProtocol.Awareness} [opts.awareness]
   * @param {Object<string,string>} [opts.params]
   * @param {typeof WebSocket} [opts.WebSocketPolyfill] Optionall provide a WebSocket polyfill
   * @param {number} [opts.resyncInterval] Request server state every `resyncInterval` milliseconds
   */
  constructor(
    socket,
    documentId: string,
    userId: string,
    doc: Y.Doc,
    {
      connect = true,
      awareness = new awarenessProtocol.Awareness(doc),
      resyncInterval = 15 * 1000,
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
    this.wsconnecting = false;
    this.bcconnected = false;
    this.wsUnsuccessfulReconnects = 0;
    this.mux = mutex.createMutex();
    this._synced = false;
    this.ws = null;
    this.wsLastMessageReceived = 0;
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
          encoding.writeVarUint(encoder, messageSync);
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
        encoding.writeVarUint(encoder, messageSync);
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
      encoding.writeVarUint(encoder, messageAwareness);
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
    // this._checkInterval = setInterval(() => {
    //   if (
    //     this.wsconnected &&
    //     messageReconnectTimeout <
    //       time.getUnixTime() - this.wsLastMessageReceived
    //   ) {
    //     // no message received in a long time - not even your own awareness
    //     // updates (which are updated every 15 seconds)
    //     /** @type {WebSocket} */ (this.ws).close();
    //   }
    // }, messageReconnectTimeout / 10);
    if (connect) {
      this.connect();
    }
  }

  /**
   * @type {boolean}
   */
  get synced() {
    return this._synced;
  }

  set synced(state) {
    if (this._synced !== state) {
      this._synced = state;
      this.emit("sync", [state]);
    }
  }

  destroy() {
    if (this._resyncInterval !== 0) {
      clearInterval(/** @type {NodeJS.Timeout} */ (this._resyncInterval));
    }
    clearInterval(this._checkInterval);
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
      encoding.writeVarUint(encoderSync, messageSync);
      syncProtocol.writeSyncStep1(encoderSync, this.doc);
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderSync));
      // broadcast local state
      const encoderState = encoding.createEncoder();
      encoding.writeVarUint(encoderState, messageSync);
      syncProtocol.writeSyncStep2(encoderState, this.doc);
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderState));
      // write queryAwareness
      const encoderAwarenessQuery = encoding.createEncoder();
      encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness);
      bc.publish(this.bcChannel, encoding.toUint8Array(encoderAwarenessQuery));
      // broadcast local awareness state
      const encoderAwarenessState = encoding.createEncoder();
      encoding.writeVarUint(encoderAwarenessState, messageAwareness);
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
    encoding.writeVarUint(encoder, messageAwareness);
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
      setupWS(this);
      this.connectBc();
    }
  }
}
