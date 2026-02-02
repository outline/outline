import type {
  onStoreDocumentPayload,
  onLoadDocumentPayload,
  onChangePayload,
  Extension,
} from "@hocuspocus/server";
import * as Y from "yjs";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import Redis from "@server/storage/redis";
import documentCollaborativeUpdater from "../commands/documentCollaborativeUpdater";
import type { withContext } from "./types";

@trace()
export default class PersistenceExtension implements Extension {
  async onLoadDocument({
    documentName,
    ...data
  }: withContext<onLoadDocumentPayload>) {
    const parts = documentName.split(".");
    const documentId = parts[1];
    const isCollection = parts[0] === "collection";

    const fieldName = "default";

    // Check if the given field already exists in the given y-doc. This is import
    // so we don't import a document fresh if it exists already.
    if (!data.document.isEmpty(fieldName)) {
      return;
    }

    if (isCollection) {
      return this.onLoadCollection(documentId, fieldName);
    }

    return this.onLoadDocumentEntity(documentId, fieldName);
  }

  private async onLoadCollection(collectionId: string, fieldName: string) {
    const collectionWithoutLock = await Collection.unscoped().findByPk(
      collectionId,
      {
        attributes: ["state"],
        rejectOnEmpty: true,
      }
    );

    if (collectionWithoutLock.state) {
      const ydoc = new Y.Doc();
      Logger.info("database", `Collection ${collectionId} is in database state`);
      Y.applyUpdate(ydoc, collectionWithoutLock.state);
      return ydoc;
    }

    return await sequelize.transaction(async (transaction) => {
      const collection = await Collection.unscoped().findByPk(collectionId, {
        attributes: ["id", "state", "description", "content"],
        transaction,
        lock: transaction.LOCK.UPDATE,
        rejectOnEmpty: true,
      });

      let ydoc;

      if (collection.state) {
        ydoc = new Y.Doc();
        Logger.info("database", `Collection ${collectionId} is in database state`);
        Y.applyUpdate(ydoc, collection.state);
        return ydoc;
      }

      if (collection.content) {
        Logger.info(
          "database",
          `Collection ${collectionId} is not in state, creating from content`
        );
        ydoc = ProsemirrorHelper.toYDoc(collection.content, fieldName);
      } else if (collection.description) {
        Logger.info(
          "database",
          `Collection ${collectionId} is not in state, creating from description`
        );
        // Convert markdown description to YDoc
        ydoc = ProsemirrorHelper.toYDoc(collection.description, fieldName);
      } else {
        ydoc = new Y.Doc();
      }

      const state = ProsemirrorHelper.toState(ydoc);
      await collection.update(
        { state },
        { silent: true, hooks: false, transaction }
      );
      return ydoc;
    });
  }

  private async onLoadDocumentEntity(documentId: string, fieldName: string) {
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
    const parts = documentName.split(".");
    const documentId = parts[1];

    // We only care about tracking collaborators for documents for now?
    // Or should we track for collections too?
    // The original code tracked it.

    if (context.user) {
      Logger.debug(
        "multiplayer",
        `${context.user.name} changed ${documentName}`
      );

      // Unique key for redis set
      const key = `collaborators:${documentName}`;

      if (parts[0] === "collection") {
        // No specific collaborator key method for collection yet
        return;
      }



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
    const parts = documentName.split(".");
    const documentId = parts[1];
    const isCollection = parts[0] === "collection";
    const clientVersion = requestParameters.get("editorVersion");

    if (isCollection) {
      // We generally don't track collaborators for collections the same way right now
      // or we need to implement it.
      // For update logic:
      // We skip collaborator check for now as we didn't implement Redis tracking for collections effectively
      // in previous step (we just returned).
      // So we strictly just save.

      try {
        // Lazy import to avoid circular dependency if any?
        // Actually standard import is fine.
        const collectionCollaborativeUpdater = require("../commands/collectionCollaborativeUpdater").default;
        await collectionCollaborativeUpdater({
          collectionId: documentId,
          ydoc: document,
        });
      } catch (err) {
        Logger.error("Unable to persist collection", err, {
          collectionId: documentId,
          userId: context.user?.id,
        });
      }
      return;
    }

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
