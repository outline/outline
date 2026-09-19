import type {
  onStoreDocumentPayload,
  onLoadDocumentPayload,
  afterLoadDocumentPayload,
  onChangePayload,
  Extension,
} from "@hocuspocus/server";
import * as Y from "yjs";
import { toError } from "@shared/utils/error";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import Document from "@server/models/Document";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import Redis from "@server/storage/redis";
import documentCollaborativeUpdater from "../commands/documentCollaborativeUpdater";
import type { withContext } from "./types";

@trace()
export default class PersistenceExtension implements Extension {
  /** The maximum number of times persisting a single document will be retried. */
  private static maxPersistFailures = 5;

  /** The names of documents that have changed since they were last persisted. */
  private unsavedDocumentNames = new Set<string>();

  /** The number of consecutive persistence failures, keyed by document name. */
  private persistFailureCounts = new Map<string, number>();

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

  async afterLoadDocument({
    documentName,
    document,
  }: afterLoadDocumentPayload) {
    // Track changes from the ydoc itself rather than the onChange hook, which
    // runs behind other extensions in an async chain and so may not have
    // recorded the change by the time the document is stored on disconnect.
    document.on("update", () => {
      this.unsavedDocumentNames.add(documentName);
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

    // Nothing to do if the document hasn't changed since it was last persisted.
    // Note the flag is cleared before writing so that changes received while
    // persisting will schedule another store.
    if (!this.unsavedDocumentNames.delete(documentName)) {
      Logger.debug("multiplayer", `No changes for ${documentName}`);
      return;
    }

    // Collaborators are used for attribution only, failure to load them must
    // not prevent the document itself from being persisted.
    let sessionCollaboratorIds: string[] = [];

    try {
      const key = Document.getCollaboratorKey(documentId);
      sessionCollaboratorIds = await Redis.defaultClient.smembers(key);
    } catch (err) {
      Logger.warn("Unable to load collaborators for document", {
        documentId,
        message: toError(err).message,
      });
    }

    try {
      await documentCollaborativeUpdater({
        documentId,
        ydoc: document,
        sessionCollaboratorIds,
        isLastConnection: clientsCount === 0,
        clientVersion,
      });

      this.persistFailureCounts.delete(documentName);
    } catch (err) {
      const failures = (this.persistFailureCounts.get(documentName) ?? 0) + 1;
      const giveUp = failures >= PersistenceExtension.maxPersistFailures;

      if (giveUp) {
        // Stop retrying, the error is unlikely to be transient. Further changes
        // to the document will set the flag again and restart the count.
        this.persistFailureCounts.delete(documentName);
      } else {
        // Restore the flag so that a subsequent store will retry the write.
        this.persistFailureCounts.set(documentName, failures);
        this.unsavedDocumentNames.add(documentName);
      }

      Logger.error("Unable to persist document", toError(err), {
        documentId,
        userId: context.user?.id,
        failures,
        giveUp,
      });
    }
  }
}
