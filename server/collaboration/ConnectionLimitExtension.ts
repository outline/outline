import {
  Extension,
  connectedPayload,
  onConnectPayload,
  onDisconnectPayload,
} from "@hocuspocus/server";
import pluralize from "pluralize";
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
  public connectionsByDocument: Map<string, Set<string>> = new Map();

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

    const connectionCount = connections?.size ?? 0;
    Logger.debug(
      "multiplayer",
      `${connectionCount} ${pluralize(
        "connection",
        connectionCount
      )} to "${documentName}"`
    );

    return Promise.resolve();
  }

  /**
   * onConnect hook is called when a new connection has been established.
   * This is where we can check if the document has reached the maximum number of
   * connections and reject the connection if it has.
   *
   * @param data The onConnect payload
   * @returns Promise, resolving will allow the connection, rejecting will drop.
   */
  onConnect({ documentName }: withContext<onConnectPayload>) {
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

    return Promise.resolve();
  }

  /**
   * Connected hook is called after a new connection has been established.
   * We can safely update the connection count for the document.
   *
   * @param data The onConnect payload
   * @returns Promise
   */
  connected({ documentName, socketId }: withContext<connectedPayload>) {
    const connections =
      this.connectionsByDocument.get(documentName) || new Set();

    connections.add(socketId);
    this.connectionsByDocument.set(documentName, connections);
    const connectionCount = connections.size ?? 0;

    Logger.debug(
      "multiplayer",
      `${connectionCount} ${pluralize(
        "connection",
        connectionCount
      )} to "${documentName}"`
    );

    return Promise.resolve();
  }
}
