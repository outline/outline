import type {
  onStoreDocumentPayload,
  onLoadDocumentPayload,
  afterLoadDocumentPayload,
  Connection,
  Extension,
} from "@hocuspocus/server";
import * as Y from "yjs";
import {
  MultiplayerEntityType,
  parseMultiplayerName,
} from "@shared/collaboration/EntityName";
import { Day } from "@shared/utils/time";
import { toError } from "@shared/utils/error";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import Redis from "@server/storage/redis";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import collectionCollaborativeUpdater from "../commands/collectionCollaborativeUpdater";
import documentCollaborativeUpdater from "../commands/documentCollaborativeUpdater";
import type { withContext } from "./types";

@trace()
export default class PersistenceExtension implements Extension {
  /** The maximum number of times persisting a single entity will be retried. */
  private static maxPersistFailures = 5;

  /** The names of entities that have changed since they were last persisted. */
  private unsavedDocumentNames = new Set<string>();

  /** The number of consecutive persistence failures, keyed by document name. */
  private persistFailureCounts = new Map<string, number>();

  /** Attribution captured synchronously with each document update. */
  private lastEditors = new WeakMap<Y.Doc, Promise<CollaborativeEdit>>();

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

  /**
   * Track edits and their authenticated origin before asynchronous hooks run.
   *
   * @param data the loaded collaborative document.
   * @returns a promise resolving when tracking is installed.
   */
  async afterLoadDocument({
    documentName,
    document,
  }: afterLoadDocumentPayload) {
    // Track changes from the ydoc itself rather than the onChange hook, which
    // runs behind other extensions in an async chain and so may not have
    // recorded the change by the time the document is stored on disconnect.
    const { id } = parseMultiplayerName(documentName);
    document.on("update", (_update: Uint8Array, origin?: Connection) => {
      this.unsavedDocumentNames.add(documentName);
      const context:
        | withContext<afterLoadDocumentPayload>["context"]
        | undefined = origin?.context;
      const userId = context?.user?.id;
      const key = RedisPrefixHelper.getCollaboratorsKey(id);
      const editor = userId
        ? Redis.defaultClient
            .zaddWithSequence(key, userId, Day.seconds)
            .then((sequence) => ({ userId, sequence }))
        : Redis.defaultClient.zlatestWithSequence(key).then((latest) => ({
            userId: latest?.member,
            sequence: latest?.sequence,
          }));

      // Updates from Redis have no connection origin. Resolve their editor
      // when received, rather than reading a potentially newer editor at save
      // time or retaining the previous local editor.
      this.lastEditors.set(
        document,
        editor.catch((err) => {
          Logger.warn("Unable to track document editor", {
            documentId: id,
            message: toError(err).message,
          });
          return { userId };
        })
      );
    });
  }

  /**
   * Persist the pending entity snapshot with its editing user.
   *
   * @param data the document and connection requesting persistence.
   * @returns a promise resolving when the persistence attempt completes.
   */
  async onStoreDocument({
    document,
    context,
    documentName,
    clientsCount,
    requestParameters,
  }: onStoreDocumentPayload) {
    const { type, id } = parseMultiplayerName(documentName);
    const clientVersion = requestParameters.get("editorVersion");

    // Nothing to do if the entity hasn't changed since it was last persisted.
    // Note the flag is cleared before writing so that changes received while
    // persisting will schedule another store.
    if (!this.unsavedDocumentNames.delete(documentName)) {
      Logger.debug("multiplayer", `No changes for ${documentName}`);
      return;
    }

    // Capture both the content and local author before yielding. New edits
    // received during Redis or database I/O belong to a subsequent save.
    const snapshot = new Y.Doc();
    Y.applyUpdate(snapshot, Y.encodeStateAsUpdate(document));
    const editor = this.lastEditors.get(document);
    const key = RedisPrefixHelper.getCollaboratorsKey(id);
    let edit: CollaborativeEdit | undefined;

    // Collaborators are used for attribution only, failure to load them must
    // not prevent the entity itself from being persisted.
    let sessionCollaboratorIds: string[] = [];

    try {
      edit = await editor;
      if (edit?.sequence !== undefined) {
        sessionCollaboratorIds = await Redis.defaultClient.zrangebyscore(
          key,
          "-inf",
          edit.sequence
        );
      }
    } catch (err) {
      Logger.warn("Unable to load collaborators", {
        documentId: id,
        message: toError(err).message,
      });
    }

    // Keep the captured editor last even if Redis failed, revision cleanup
    // removed their entry, or a later edit moved it beyond this snapshot's sequence.
    const editingUserId = edit?.userId;
    if (editingUserId) {
      sessionCollaboratorIds = [
        ...sessionCollaboratorIds.filter((userId) => userId !== editingUserId),
        editingUserId,
      ];
    }

    try {
      if (type === MultiplayerEntityType.Collection) {
        await collectionCollaborativeUpdater({
          collectionId: id,
          ydoc: snapshot,
          sessionCollaboratorIds,
          isLastConnection: clientsCount === 0,
        });

        // Collections have no revision pipeline to consume the collaborators
        // (documents are consumed by RevisionsProcessor), so clear them here
        // once the last client disconnects to avoid stale IDs in Redis.
        if (clientsCount === 0) {
          await Redis.defaultClient.del(key);
        }
      } else {
        await documentCollaborativeUpdater({
          documentId: id,
          ydoc: snapshot,
          collaborators: {
            ids: sessionCollaboratorIds,
            sequence: edit?.sequence,
          },
          isLastConnection: clientsCount === 0,
          clientVersion,
        });
      }

      this.persistFailureCounts.delete(documentName);
    } catch (err) {
      const failures = (this.persistFailureCounts.get(documentName) ?? 0) + 1;
      const giveUp = failures >= PersistenceExtension.maxPersistFailures;

      if (giveUp) {
        // Stop retrying, the error is unlikely to be transient. Further changes
        // to the entity will set the flag again and restart the count.
        this.persistFailureCounts.delete(documentName);
      } else {
        // Restore the flag so that a subsequent store will retry the write.
        this.persistFailureCounts.set(documentName, failures);
        this.unsavedDocumentNames.add(documentName);
      }

      Logger.error(`Unable to persist ${type}`, toError(err), {
        documentId: id,
        userId: context.user?.id,
        failures,
        giveUp,
      });
    } finally {
      snapshot.destroy();
    }
  }

  /**
   * Hydrates a YJS document from stored collaborative state.
   *
   * @param name A label for the entity used in logging.
   * @param state The stored collaborative state.
   * @returns the hydrated YJS document.
   */
  private hydrateFromState(name: string, state: Uint8Array): Y.Doc {
    Logger.info("database", `${name} is in database state`);
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, state);
    return ydoc;
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
      return this.hydrateFromState(
        `Document ${documentId}`,
        documentWithoutLock.state
      );
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
        return this.hydrateFromState(`Document ${documentId}`, document.state);
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
      return this.hydrateFromState(
        `Collection ${collectionId}`,
        collectionWithoutLock.state
      );
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
        return this.hydrateFromState(
          `Collection ${collectionId}`,
          collection.state
        );
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

interface CollaborativeEdit {
  userId?: string;
  sequence?: number;
}
