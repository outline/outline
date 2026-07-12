import type {
  onStoreDocumentPayload,
  onLoadDocumentPayload,
  onChangePayload,
  Extension,
} from "@hocuspocus/server";
import * as Y from "yjs";
import {
  MultiplayerEntityType,
  parseMultiplayerName,
} from "@shared/collaboration/EntityName";
import { toError } from "@shared/utils/error";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import Redis from "@server/storage/redis";
import collectionCollaborativeUpdater from "../commands/collectionCollaborativeUpdater";
import documentCollaborativeUpdater from "../commands/documentCollaborativeUpdater";
import type { withContext } from "./types";

@trace()
export default class PersistenceExtension implements Extension {
  async onLoadDocument({
    documentName,
    ...data
  }: withContext<onLoadDocumentPayload>) {
    const { type, id } = parseMultiplayerName(documentName);
    const fieldName = "default";

    // Check if the given field already exists in the given y-doc. This is import
    // so we don't import a document fresh if it exists already.
    if (!data.document.isEmpty(fieldName)) {
      return;
    }

    if (type === MultiplayerEntityType.Collection) {
      return this.loadCollection(id, fieldName);
    }

    return this.loadDocument(id, fieldName);
  }

  async onChange({ context, documentName }: withContext<onChangePayload>) {
    const { type, id } = parseMultiplayerName(documentName);

    if (context.user) {
      Logger.debug(
        "multiplayer",
        `${context.user.name} changed ${documentName}`
      );

      const key =
        type === MultiplayerEntityType.Collection
          ? Collection.getCollaboratorKey(id)
          : Document.getCollaboratorKey(id);
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
    const { type, id } = parseMultiplayerName(documentName);
    const clientVersion = requestParameters.get("editorVersion");

    const key =
      type === MultiplayerEntityType.Collection
        ? Collection.getCollaboratorKey(id)
        : Document.getCollaboratorKey(id);
    const sessionCollaboratorIds = await Redis.defaultClient.smembers(key);
    if (!sessionCollaboratorIds || sessionCollaboratorIds.length === 0) {
      Logger.debug("multiplayer", `No changes for ${documentName}`);
      return;
    }

    try {
      if (type === MultiplayerEntityType.Collection) {
        await collectionCollaborativeUpdater({
          collectionId: id,
          ydoc: document,
          sessionCollaboratorIds,
          isLastConnection: clientsCount === 0,
        });
      } else {
        await documentCollaborativeUpdater({
          documentId: id,
          ydoc: document,
          sessionCollaboratorIds,
          isLastConnection: clientsCount === 0,
          clientVersion,
        });
      }
    } catch (err) {
      Logger.error(`Unable to persist ${type}`, toError(err), {
        documentId: id,
        userId: context.user?.id,
      });
    }
  }

  /**
   * Loads the collaborative state for a document, creating it from the
   * content or text if it does not exist yet.
   *
   * @param documentId The document ID.
   * @param fieldName The YJS field name.
   * @returns a promise resolving to the YJS document, or undefined.
   */
  private async loadDocument(documentId: string, fieldName: string) {
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

  /**
   * Loads the collaborative state for a collection description, creating it
   * from the content snapshot if it does not exist yet.
   *
   * @param collectionId The collection ID.
   * @param fieldName The YJS field name.
   * @returns a promise resolving to the YJS document, or undefined.
   */
  private async loadCollection(collectionId: string, fieldName: string) {
    // First, try to find the collection without a lock to check if it has state
    const collectionWithoutLock = await Collection.unscoped().findOne({
      attributes: ["state"],
      rejectOnEmpty: true,
      where: {
        id: collectionId,
      },
    });

    // If the collection already has state, we can return it without needing a transaction
    if (collectionWithoutLock.state) {
      const ydoc = new Y.Doc();
      Logger.info(
        "database",
        `Collection ${collectionId} is in database state`
      );
      Y.applyUpdate(ydoc, collectionWithoutLock.state);
      return ydoc;
    }

    // If the collection doesn't have state yet, we need to acquire a lock and create it
    return await sequelize.transaction(async (transaction) => {
      const collection = await Collection.unscoped().findOne({
        attributes: ["id", "state", "content", "description"],
        transaction,
        lock: transaction.LOCK.UPDATE,
        rejectOnEmpty: true,
        where: {
          id: collectionId,
        },
      });

      // Double-check the state in case another process created it
      if (collection.state) {
        const ydoc = new Y.Doc();
        Logger.info(
          "database",
          `Collection ${collectionId} is in database state`
        );
        Y.applyUpdate(ydoc, collection.state);
        return ydoc;
      }

      Logger.info(
        "database",
        `Collection ${collectionId} is not in state, creating from content`
      );
      const ydoc = ProsemirrorHelper.toYDoc(
        collection.content ?? collection.description ?? "",
        fieldName
      );
      const state = ProsemirrorHelper.toState(ydoc);
      await collection.update(
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
}
