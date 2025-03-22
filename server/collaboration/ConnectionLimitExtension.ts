import {
  Extension,
  onConnectPayload,
  onDisconnectPayload,
} from "@hocuspocus/server";
import { TooManyConnections } from "@shared/collaboration/CloseEvents";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { withContext } from "./types";

@trace()
export class ConnectionLimitExtension implements Extension {
  /**
   * Map of documentId -> connection count
   */
  connectionsByDocument: Map<string, Set<string>> = new Map();

  /**
   * On disconnect hook
   *
   * @param data The disconnect payload
   * @returns Promise
   */
  onDisconnect({ documentName, socketId }: withContext<onDisconnectPayload>) {
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
   * On connect hook
   *
   * @param data The connect payload
   * @returns Promise, resolving will allow the connection, rejecting will drop it
   */
  onConnect({ documentName, socketId }: withContext<onConnectPayload>) {
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

    connections.add(socketId);
    this.connectionsByDocument.set(documentName, connections);

    Logger.debug(
      "multiplayer",
      `${connections.size} connections to "${documentName}"`
    );

    return Promise.resolve();
  }
}
