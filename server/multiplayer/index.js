// @flow
import { Logger } from "@hocuspocus/extension-logger";
import { Server } from "@hocuspocus/server";
import debug from "debug";
import { debounce } from "lodash";
//import { RocksDB } from "@hocuspocus/extension-rocksdb";
import { parser } from "rich-markdown-editor";
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import documentUpdater from "../commands/documentUpdater";
import { AuthenticationError } from "../errors";
import { Document } from "../models";
import policy from "../policies";
import { getUserForJWT } from "../utils/jwt";

// const isProduction = process.env.NODE_ENV === "production";
const log = debug("server");
const { can } = policy;
const PERSIST_WAIT = 3000;

const server = Server.configure({
  port: process.env.MULTIPLAYER_PORT || process.env.PORT || 80,

  async onConnect({ connection, requestParameters, documentName }) {
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
      connection.readOnly = true;
    }

    return {
      user,
    };
  },

  async onCreateDocument({ document: ydoc, context, documentName }) {
    const [, documentId] = documentName.split(".");
    const fieldName = "default";

    // Check if the given field already exists in the given y-doc.
    // Important: Only import a document if it doesn't exist in the primary data storage!
    if (!ydoc.isEmpty(fieldName)) {
      return;
    }

    // Get the document from somewhere. In a real world application this would
    // probably be a database query or an API call
    const document = await Document.findByPk(documentId);

    if (document.state) {
      log(`Document ${documentId} is already in state`);
      Y.applyUpdate(ydoc, document.state);
    } else {
      log(`Document ${documentId} is not in state, creating from text`);
      const node = parser.parse(document.text);
      Y.applyUpdate(
        ydoc,
        Y.encodeStateAsUpdate(prosemirrorToYDoc(node, fieldName))
      );
    }

    return ydoc;
  },

  onChange: debounce(
    async ({ document, context, documentName }) => {
      const [, documentId] = documentName.split(".");

      log(`persisting ${documentId}`);

      if (!context.user) {
        console.log("NO USER, WHY?");
        return;
      }

      await documentUpdater({
        documentId,
        ydoc: document,
        userId: context.user.id,
      });
    },
    PERSIST_WAIT,
    {
      maxWait: PERSIST_WAIT * 3,
    }
  ),

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
