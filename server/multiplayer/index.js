// @flow
import { Logger } from "@hocuspocus/extension-logger";
import { Server } from "@hocuspocus/server";
import debug from "debug";
//import { RocksDB } from "@hocuspocus/extension-rocksdb";
import { AuthenticationError } from "../errors";
import { Document } from "../models";
import policy from "../policies";
import { getUserForJWT } from "../utils/jwt";

// const isProduction = process.env.NODE_ENV === "production";
// const log = debug("multiplayer");
const { can } = policy;

const server = Server.configure({
  port: process.env.MULTIPLAYER_PORT || process.env.PORT || 80,

  async onConnect(data) {
    const { requestParameters, documentName } = data;

    // allows for different entity types to use this multiplayer provider later
    const [, documentId] = documentName.split(".");

    // TODO: https://github.com/ueberdosis/hocuspocus/issues/145
    const token = requestParameters.get("token");

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
    // new RocksDB({
    //   path: "./database",

    //   options: {
    //     // see available options:
    //     // https://www.npmjs.com/package/leveldown#options
    //     createIfMissing: true,
    //   },
    // }),
  ],
});

export async function start() {
  console.log(`Started multiplayer server`);
  server.listen();
}
