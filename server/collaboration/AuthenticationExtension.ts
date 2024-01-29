import { onAuthenticatePayload, Extension } from "@hocuspocus/server";
import { trace } from "@server/logging/tracing";
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
    // allows for different entity types to use this multiplayer provider later
    const [, documentId] = documentName.split(".");

    if (!token) {
      throw AuthenticationError("Authentication required");
    }

    const user = await getUserForJWT(token, ["session", "collaboration"]);

    if (user.isSuspended) {
      throw AuthenticationError("Account suspended");
    }

    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });

    if (!can(user, "read", document)) {
      throw AuthenticationError("Authorization required");
    }

    // set document to read only for the current user, thus changes will not be
    // accepted and synced to other clients
    if (!can(user, "update", document)) {
      connection.readOnly = true;
    }

    return {
      user,
    };
  }
}
