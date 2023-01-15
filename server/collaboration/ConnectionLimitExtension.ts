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
   * Map of documentId -> userIds that have modified the document since it
   * was last persisted to the database. The map is cleared on every save.
   */
  connectionsByDocument: Map<string, number> = new Map();

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
   * @param data
   */
  onConnect(data: onConnectPayload) {
    const { documentName } = data;

    const currConnections = this.connectionsByDocument.get(documentName) || 0;
    if (currConnections >= env.COLLABORATION_MAX_CLIENTS_PER_DOCUMENT) {
      Logger.info(
        "multiplayer",
        `Rejected connection to "${documentName}" because it has reached the maximum number of connections`
      );
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
