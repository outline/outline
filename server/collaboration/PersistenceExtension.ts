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
import documentCollaborativeUpdater from "../commands/documentCollaborativeUpdater";
import { withContext } from "./types";

@trace()
export default class PersistenceExtension implements Extension {
  /**
   * Map of documentId -> userIds that have modified the document since it
   * was last persisted to the database. The map is cleared on every save.
   */
  documentCollaboratorIds = new Map<string, Set<string>>();

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

    return await sequelize.transaction(async (transaction) => {
      const document = await Document.scope("withState").findOne({
        transaction,
        lock: transaction.LOCK.UPDATE,
        rejectOnEmpty: true,
        where: {
          id: documentId,
        },
      });

      let ydoc;
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
    Logger.debug(
      "multiplayer",
      `${context.user?.name} changed ${documentName}`
    );

    const state = this.documentCollaboratorIds.get(documentName) ?? new Set();
    if (context.user) {
      state.add(context.user.id);
    }
    this.documentCollaboratorIds.set(documentName, state);
  }

  async onStoreDocument({
    document,
    context,
    documentName,
    clientsCount,
  }: onStoreDocumentPayload) {
    const [, documentId] = documentName.split(".");

    // Find the collaborators that have modified the document since it was last
    // persisted and clear the map, if there's no collaborators then we don't
    // need to persist the document.
    const documentCollaboratorIds =
      this.documentCollaboratorIds.get(documentName);
    if (!documentCollaboratorIds) {
      Logger.debug("multiplayer", `No changes for ${documentName}`);
      return;
    }

    const sessionCollaboratorIds = Array.from(documentCollaboratorIds.values());
    this.documentCollaboratorIds.delete(documentName);

    try {
      await documentCollaborativeUpdater({
        documentId,
        ydoc: document,
        sessionCollaboratorIds,
        isLastConnection: clientsCount === 0,
      });
    } catch (err) {
      Logger.error("Unable to persist document", err, {
        documentId,
        userId: context.user?.id,
      });
    }
  }
}
