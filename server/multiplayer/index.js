// @flow
import { Logger } from "@hocuspocus/extension-logger";
import { Server } from "@hocuspocus/server";
import { AuthenticationError } from "../errors";
import { Document } from "../models";
import policy from "../policies";
import { getUserForJWT } from "../utils/jwt";
import Persistence from "./persistence";

const { can } = policy;
// const isProduction = process.env.NODE_ENV === "production";

const server = Server.configure({
  port: process.env.MULTIPLAYER_PORT || process.env.PORT || 80,

  // TODO: Move to extension once ueberdosis/hocuspocus#170 is addressed
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
  },

  extensions: [new Persistence({ delay: 3000 }), new Logger()],
});

export async function start() {
  console.log(`Started multiplayer server`);
  server.listen();
}
