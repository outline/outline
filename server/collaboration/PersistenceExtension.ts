import {
  onStoreDocumentPayload,
  onLoadDocumentPayload,
  onChangePayload,
  Extension,
} from "@hocuspocus/server";
import * as Y from "yjs";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import Document from "@server/models/Document";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import Redis from "@server/storage/redis";
import documentCollaborativeUpdater from "../commands/documentCollaborativeUpdater";
import { withContext } from "./types";

@trace()
export default class PersistenceExtension implements Extension {
  async onLoadDocument({
    documentName,
    ...data
  }: withContext<onLoadDocumentPayload>) {
    const [, documentId] = documentName.split(".");
    const fieldName = "default";

    // Check if the given field already exists in the given y-doc. This is import
    // so we don't import a document fresh if it exists already.
    if (!data.document.isEmpty(fieldName)) {
      return;
    }

    // First, try to find the document without a lock to check if it has state
    const documentWithoutLock = await Document.unscoped().findOne({
      attributes: ["state"],
      rejectOnEmpty: true,
      where: {
        id: documentId,
      },
    });

    // If the document already has state, we can return it without needing a transaction
    if (documentWithoutLock.state) {
      const ydoc = new Y.Doc();
      Logger.info("database", `Document ${documentId} is in database state`);
      Y.applyUpdate(ydoc, documentWithoutLock.state);
      return ydoc;
    }

    // If the document doesn't have state yet, we need to acquire a lock and create it
    return await sequelize.transaction(async (transaction) => {
      const document = await Document.unscoped().findOne({
        attributes: ["id", "state", "content", "text"],
        transaction,
        lock: transaction.LOCK.UPDATE,
        rejectOnEmpty: true,
        where: {
          id: documentId,
        },
      });
      let ydoc;

      // Double-check the state in case another process created it
      if (document.state) {
        ydoc = new Y.Doc();
        Logger.info("database", `Document ${documentId} is in database state`);
        Y.applyUpdate(ydoc, document.state);
        return ydoc;
      }

      if (document.content) {
        Logger.info(
          "database",
          `Document ${documentId} is not in state, creating from content`
        );
        ydoc = ProsemirrorHelper.toYDoc(document.content, fieldName);
      } else {
        Logger.info(
          "database",
          `Document ${documentId} is not in state, creating from text`
        );
        ydoc = ProsemirrorHelper.toYDoc(document.text, fieldName);
      }
      const state = ProsemirrorHelper.toState(ydoc);
      await document.update(
        {
          state,
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

  async onChange({ context, documentName }: withContext<onChangePayload>) {
    const [, documentId] = documentName.split(".");

    if (context.user) {
      Logger.debug(
        "multiplayer",
        `${context.user.name} changed ${documentName}`
      );

      const key = Document.getCollaboratorKey(documentId);
      await Redis.defaultClient.sadd(key, context.user.id);
    }
  }

  async onStoreDocument({
    document,
    context,
    documentName,
    clientsCount,
    requestParameters,
  }: onStoreDocumentPayload) {
    const [, documentId] = documentName.split(".");
    const clientVersion = requestParameters.get("editorVersion");

    const key = Document.getCollaboratorKey(documentId);
    const sessionCollaboratorIds = await Redis.defaultClient.smembers(key);
    if (!sessionCollaboratorIds || sessionCollaboratorIds.length === 0) {
      Logger.debug("multiplayer", `No changes for ${documentName}`);
      return;
    }

    try {
      await documentCollaborativeUpdater({
        documentId,
        ydoc: document,
        sessionCollaboratorIds,
        isLastConnection: clientsCount === 0,
        clientVersion,
      });
    } catch (err) {
      Logger.error("Unable to persist document", err, {
        documentId,
        userId: context.user?.id,
      });
    }
  }
}
