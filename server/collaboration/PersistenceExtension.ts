import {
  onStoreDocumentPayload,
  onLoadDocumentPayload,
  Extension,
} from "@hocuspocus/server";
import invariant from "invariant";
import * as Y from "yjs";
import { sequelize } from "@server/database/sequelize";
import Logger from "@server/logging/Logger";
import { APM } from "@server/logging/tracing";
import Document from "@server/models/Document";
import documentCollaborativeUpdater from "../commands/documentCollaborativeUpdater";
import markdownToYDoc from "./utils/markdownToYDoc";

@APM.trace({
  spanName: "persistence",
})
export default class PersistenceExtension implements Extension {
  async onLoadDocument({ documentName, ...data }: onLoadDocumentPayload) {
    const [, documentId] = documentName.split(".");
    const fieldName = "default";

    // Check if the given field already exists in the given y-doc. This is import
    // so we don't import a document fresh if it exists already.
    if (!data.document.isEmpty(fieldName)) {
      return;
    }

    return await sequelize.transaction(async (transaction) => {
      const document = await Document.scope("withState").findOne({
        transaction,
        lock: transaction.LOCK.UPDATE,
        where: {
          id: documentId,
        },
      });
      invariant(document, "Document not found");

      if (document.state) {
        const ydoc = new Y.Doc();
        Logger.info("database", `Document ${documentId} is in database state`);
        Y.applyUpdate(ydoc, document.state);
        return ydoc;
      }

      Logger.info(
        "database",
        `Document ${documentId} is not in state, creating from markdown`
      );
      const ydoc = markdownToYDoc(document.text, fieldName);
      const state = Y.encodeStateAsUpdate(ydoc);
      await document.update(
        {
          state: Buffer.from(state),
        },
        {
          silent: true,
          hooks: false,
          transaction,
        }
      );
      return ydoc;
    });
  }

  async onStoreDocument({
    document,
    context,
    documentName,
  }: onStoreDocumentPayload) {
    const [, documentId] = documentName.split(".");
    Logger.info("database", `Persisting ${documentId}`);

    try {
      await documentCollaborativeUpdater({
        documentId,
        ydoc: document,
        userId: context.user?.id,
      });
    } catch (err) {
      Logger.error("Unable to persist document", err, {
        documentId,
        userId: context.user?.id,
      });
    }
  }
}
