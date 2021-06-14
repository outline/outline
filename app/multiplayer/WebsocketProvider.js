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
    provider.wsPublish(buff);
  }
  if (provider.bcconnected) {
    provider.mux(() => {
      bc.publish(provider.documentId, buff);
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
      awareness = new awarenessProtocol.Awareness(doc),
      resyncInterval = 0,
    }: {
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
    this.awareness = awareness;
    this.wsconnected = false;
    this.bcconnected = false;
    this.shouldConnect = true;
    this.mux = mutex.createMutex();
    this._synced = false;
    this._resyncInterval = 0;

    if (resyncInterval > 0) {
      this._resyncInterval = setInterval(() => {
        if (this.ws) {
          // resend sync step 1
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.writeSyncStep1(encoder, doc);
          this.wsPublish(encoding.toUint8Array(encoder));
        }
      }, resyncInterval);
    }

    this.doc.on("update", this._updateHandler);

    window.addEventListener("beforeunload", this._unloadHandler);
    awareness.on("update", this._awarenessUpdateHandler);

    this.connect();
  }

  _unloadHandler = () => {
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      "window unload"
    );
  };

  _bcSubscriber = (data: ArrayBuffer) => {
    this.mux(() => {
      const encoder = readMessage(this, new Uint8Array(data), false);
      if (encoding.length(encoder) > 1) {
        bc.publish(this.bcChannel, encoding.toUint8Array(encoder));
      }
    });
  };

  /**
   * Listens to Yjs updates and sends them to remote peers (ws and broadcastchannel)
   */
  _updateHandler = (update: Uint8Array, origin: any) => {
    if (origin !== this || origin === null) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      broadcastMessage(this, encoding.toUint8Array(encoder));
    }
  };

  _awarenessUpdateHandler = ({ added, updated, removed }: any, origin: any) => {
    const changedClients = added.concat(updated).concat(removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
    );
    broadcastMessage(this, encoding.toUint8Array(encoder));
  };

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
    this.awareness.destroy();
    window.removeEventListener("beforeunload", this._unloadHandler);
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

  wsPublish(data: ArrayBuffer) {
    if (!data) return;

    this.socket.binary(true).emit("sync", {
      documentId: this.documentId,
      userId: this.userId,
      data,
    });
  }

  _wsMessageHandler = (event: {
    documentId: string,
    userId: string,
    data: ArrayBuffer,
  }) => {
    if (event.documentId === this.documentId) {
      const encoder = readMessage(this, new Uint8Array(event.data), true);
      if (encoding.length(encoder) > 1) {
        this.wsPublish(encoding.toUint8Array(encoder));
      }
    }
  };

  _wsCloseHandler = () => {
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      Array.from(this.awareness.getStates().keys()),
      this
    );

    this.emit("status", [
      {
        status: "disconnected",
      },
    ]);
  };

  _wsJoinHandler = (event: { documentId: string, userId: string }) => {
    if (event.userId !== this.userId || event.documentId !== this.documentId) {
      return;
    }
    console.log("user.join");

    this.awareness.setLocalState({});

    this.emit("status", [
      {
        status: "connected",
      },
    ]);

    console.log("writing sync step 1");

    // always send sync step 1 when connected
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    this.wsPublish(encoding.toUint8Array(encoder));

    // broadcast local awareness state
    if (this.awareness.getLocalState() !== null) {
      console.log("broadcast awareness state");

      const encoderAwarenessState = encoding.createEncoder();
      encoding.writeVarUint(encoderAwarenessState, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoderAwarenessState,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
          this.doc.clientID,
        ])
      );

      this.wsPublish(encoding.toUint8Array(encoderAwarenessState));
    }
  };

  connectWs() {
    this.socket.on("document.sync", this._wsMessageHandler);
    this.socket.on("disconnect", this._wsCloseHandler);
    this.socket.on("user.join", this._wsJoinHandler);
  }

  disconnectWs() {
    this.socket.off("document.sync", this._wsMessageHandler);
    this.socket.off("disconnect", this._wsCloseHandler);
    this.socket.off("user.join", this._wsJoinHandler);
  }

  disconnect() {
    this.shouldConnect = false;
    this.disconnectWs();
    this.disconnectBc();
  }

  connect() {
    this.shouldConnect = true;

    if (!this.wsconnected) {
      this.wsconnected = true;
      this.connectWs();
      this.connectBc();
    }
  }
}
