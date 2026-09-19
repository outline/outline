import type {
  Connection,
  Extension,
  onAwarenessUpdatePayload,
} from "@hocuspocus/server";
import { AuthorizationFailed } from "@shared/collaboration/CloseEvents";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import type { withContext } from "./types";

interface AwarenessUserField {
  id?: unknown;
}

interface AwarenessState {
  user?: AwarenessUserField;
}

/**
 * Enforces that the `user.id` field in every awareness state matches the
 * authenticated user for the connection that produced the update.
 *
 * Clients control their own awareness - when a mismatch is detected the
 * connection is closed, which also removes its awareness states for all
 * other clients.
 */
@trace()
export default class AwarenessIdentityExtension implements Extension {
  async onAwarenessUpdate({
    document,
    added,
    updated,
    awareness,
  }: withContext<onAwarenessUpdatePayload>) {
    const clientIds = [...added, ...updated];
    if (clientIds.length === 0) {
      return;
    }

    for (const clientId of clientIds) {
      const connection = this.findConnectionForClient(document, clientId);
      if (!connection) {
        continue;
      }

      const authUser = connection.context.user;
      if (!authUser) {
        continue;
      }

      const state: AwarenessState | undefined = awareness
        .getStates()
        .get(clientId);
      const claimedUser = state?.user;
      if (!claimedUser) {
        continue;
      }

      if (claimedUser.id === authUser.id) {
        continue;
      }

      Logger.warn("Awareness identity mismatch, closing connection", {
        documentName: document.name,
        clientId,
        claimedUserId: JSON.stringify(claimedUser.id),
        authenticatedUserId: authUser.id,
      });

      connection.close(AuthorizationFailed);
    }
  }

  private findConnectionForClient(
    document: onAwarenessUpdatePayload["document"],
    clientId: number
  ): withContext<Connection> | undefined {
    for (const entry of document.connections.values()) {
      if (entry.clients.has(clientId)) {
        return entry.connection;
      }
    }
    return undefined;
  }
}
