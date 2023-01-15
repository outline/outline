import {
  Extension,
  onConnectPayload,
  onDisconnectPayload,
} from "@hocuspocus/server";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";

@trace()
export class ConnectionLimitExtension implements Extension {
  /**
   * Map of documentId -> connection count
   */
  connectionsByDocument: Map<string, number> = new Map();

  /**
   * onDisconnect hook
   * @param data The disconnect payload
   */
  onDisconnect(data: onDisconnectPayload) {
    const { documentName } = data;

    const currConnections = this.connectionsByDocument.get(documentName) || 0;
    const newConnections = currConnections - 1;
    this.connectionsByDocument.set(documentName, newConnections);

    Logger.debug(
      "multiplayer",
      `${newConnections} connections to "${documentName}"`
    );

    return Promise.resolve();
  }

  /**
   * onConnect hook
   * @param data The connect payload
   */
  onConnect(data: onConnectPayload) {
    const { documentName } = data;

    const currConnections = this.connectionsByDocument.get(documentName) || 0;
    if (currConnections >= env.COLLABORATION_MAX_CLIENTS_PER_DOCUMENT) {
      Logger.info(
        "multiplayer",
        `Rejected connection to "${documentName}" because it has reached the maximum number of connections`
      );

      // Rejecting the promise will cause the connection to be dropped.
      return Promise.reject();
    }

    const newConnections = currConnections + 1;
    this.connectionsByDocument.set(documentName, newConnections);

    Logger.debug(
      "multiplayer",
      `${newConnections} connections to "${documentName}"`
    );

    return Promise.resolve();
  }
}
