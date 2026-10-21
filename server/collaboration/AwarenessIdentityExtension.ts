import type { Extension, beforeHandleMessagePayload } from "@hocuspocus/server";
import { MessageType } from "@hocuspocus/server";
import {
  createDecoder,
  readVarString,
  readVarUint,
  readVarUint8Array,
} from "lib0/decoding";
import { AuthorizationFailed } from "@shared/collaboration/CloseEvents";
import Logger from "@server/logging/Logger";
import type { withContext } from "./types";

interface AwarenessUserField {
  id?: unknown;
}

interface AwarenessState {
  user?: AwarenessUserField;
}

/**
 * Enforces that awareness updates sent by a client are valid.
 *
 * Clients control their own awareness - the raw message is inspected before it
 * is applied so a forged state is never broadcast. When a violation is detected
 * the sending connection is closed.
 */
export default class AwarenessIdentityExtension implements Extension {
  async beforeHandleMessage({
    document,
    documentName,
    socketId,
    context,
    update,
  }: withContext<beforeHandleMessagePayload>) {
    // The message type is a single-byte varint for all known types.
    if (update[0] !== MessageType.Awareness) {
      return;
    }

    const authUser = context.user;
    if (!authUser) {
      return;
    }

    // For performance, this is kept low-level
    const decoder = createDecoder(update);
    readVarUint(decoder);
    const payload = createDecoder(readVarUint8Array(decoder));
    const count = readVarUint(payload);

    for (let i = 0; i < count; i++) {
      const clientId = readVarUint(payload);
      readVarUint(payload);
      const encoded = readVarString(payload);

      const owner = this.findClientOwner(document, clientId);
      if (owner !== undefined && owner !== socketId) {
        Logger.warn("Awareness update for foreign client, closing connection", {
          documentName,
          socketId,
          clientId,
          authenticatedUserId: authUser.id,
        });
        throw AuthorizationFailed;
      }

      if (encoded === "null") {
        continue;
      }

      const state: AwarenessState | null = JSON.parse(encoded);
      const claimedUser = state?.user;
      if (!claimedUser || claimedUser.id === authUser.id) {
        continue;
      }

      Logger.warn("Awareness identity mismatch, closing connection", {
        documentName,
        socketId,
        clientId,
        claimedUserId: JSON.stringify(claimedUser.id),
        authenticatedUserId: authUser.id,
      });
      throw AuthorizationFailed;
    }
  }

  private findClientOwner(
    document: beforeHandleMessagePayload["document"],
    clientId: number
  ): string | undefined {
    for (const entry of document.connections.values()) {
      if (entry.clients.has(clientId)) {
        return entry.connection.socketId;
      }
    }
    return undefined;
  }
}
