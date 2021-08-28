// @flow
import { AuthenticationError } from "../errors";
import { Document } from "../models";
import policy from "../policies";
import { getUserForJWT } from "../utils/jwt";

const { can } = policy;

export default class Authentication {
  async onAuthenticate({
    connection,
    token,
    documentName,
  }: {
    connection: { readOnly: boolean },
    token: string,
    documentName: string,
  }) {
    // allows for different entity types to use this multiplayer provider later
    const [, documentId] = documentName.split(".");

    if (!token) {
      throw new AuthenticationError("Authentication required");
    }

    const user = await getUserForJWT(token);
    if (user.isSuspended) {
      throw new AuthenticationError("Account suspended");
    }

    const document = await Document.findByPk(documentId, { userId: user.id });
    if (!can(user, "read", document)) {
      throw new AuthenticationError("Authorization required");
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
