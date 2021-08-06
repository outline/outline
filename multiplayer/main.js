// @flow
import { Logger } from "@hocuspocus/extension-logger";
import { RocksDB } from "@hocuspocus/extension-rocksdb";
import { Server } from "@hocuspocus/server";
import { AuthenticationError } from "../server/errors";
import { Document } from "../server/models";
import policy from "../server/policies";
import { getUserForJWT } from "../server/utils/jwt";

const { can } = policy;

const server = Server.configure({
  port: process.env.MULTIPLAYER_PORT || process.env.PORT || 80,

  async onConnect(data) {
    const { requestParameters, documentName: documentId } = data;
    const { token } = requestParameters;

    if (!token) {
      throw new AuthenticationError("Authentication required");
    }

    const user = await getUserForJWT(token);
    if (user.isSuspended) {
      throw new AuthenticationError("Account suspended");
    }

    const document = await Document.findByPk(documentId, { userid: user.id });
    if (!can(user, "read", document)) {
      throw new AuthenticationError("Authorization required");
    }

    // set document to read only for the current user, thus changes will not be
    // accepted and synced to other clients
    if (!can(user, "update", document)) {
      data.connection.readOnly = true;
    }

    return {
      user,
    };
  },

  extensions: [
    new Logger(),
    new RocksDB({
      path: "./database",

      options: {
        // see available options:
        // https://www.npmjs.com/package/leveldown#options
        createIfMissing: true,
      },
    }),
  ],
});

export async function start() {
  console.log(`Started multiplayer server`);
  server.listen();
}
