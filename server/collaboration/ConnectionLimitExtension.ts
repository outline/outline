import {
  Extension,
  onConnectPayload,
  onDisconnectPayload,
} from "@hocuspocus/server";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { TooManyConnections } from "./CloseEvents";

@trace()
export class ConnectionLimitExtension implements Extension {
  /**
   * Map of documentId -> connection count
   */
  connectionsByDocument: Map<string, Set<string>> = new Map();

  /**
   * onDisconnect hook
   * @param data The disconnect payload
   */
  onDisconnect(data: onDisconnectPayload) {
    const { documentName, socketId } = data;

    const connections = this.connectionsByDocument.get(documentName);
    if (connections) {
      connections.delete(socketId);

      if (connections.size === 0) {
        this.connectionsByDocument.delete(documentName);
      } else {
        this.connectionsByDocument.set(documentName, connections);
      }
    }

    Logger.debug(
      "multiplayer",
      `${connections?.size} connections to "${documentName}"`
    );

    return Promise.resolve();
  }

  /**
   * onConnect hook
   * @param data The connect payload
   */
  onConnect(data: onConnectPayload) {
    const { documentName } = data;

    const connections =
      this.connectionsByDocument.get(documentName) || new Set();
    if (connections?.size >= env.COLLABORATION_MAX_CLIENTS_PER_DOCUMENT) {
      Logger.info(
        "multiplayer",
        `Rejected connection to "${documentName}" because it has reached the maximum number of connections`
      );

      // Rejecting the promise will cause the connection to be dropped.
      return Promise.reject(TooManyConnections);
    }

    connections.add(data.socketId);
    this.connectionsByDocument.set(documentName, connections);

    Logger.debug(
      "multiplayer",
      `${connections.size} connections to "${documentName}"`
    );

    return Promise.resolve();
  }
}
