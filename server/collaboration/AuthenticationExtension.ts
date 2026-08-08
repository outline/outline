import type { onAuthenticatePayload, Extension } from "@hocuspocus/server";
import {
  MultiplayerEntityType,
  parseMultiplayerName,
} from "@shared/collaboration/EntityName";
import { trace } from "@server/logging/tracing";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import { can } from "@server/policies";
import { getUserForJWT } from "@server/utils/jwt";
import { AuthenticationError } from "../errors";

@trace()
export default class AuthenticationExtension implements Extension {
  async onAuthenticate({
    connection,
    token,
    documentName,
  }: onAuthenticatePayload) {
    const { type, id } = parseMultiplayerName(documentName);

    if (!token) {
      throw AuthenticationError("Authentication required");
    }

    const { user } = await getUserForJWT(token, ["session", "collaboration"]);
    const entity =
      type === MultiplayerEntityType.Collection
        ? await Collection.findByPk(id, {
            userId: user.id,
          })
        : await Document.findByPk(id, {
            userId: user.id,
          });

    if (!can(user, "read", entity)) {
      throw AuthenticationError("Authorization required");
    }

    // set document to read only for the current user, thus changes will not be
    // accepted and synced to other clients
    if (!can(user, "update", entity)) {
      connection.readOnly = true;
    }

    return {
      user,
    };
  }
}
