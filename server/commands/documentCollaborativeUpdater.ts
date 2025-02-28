import isEqual from "fast-deep-equal";
import uniq from "lodash/uniq";
import { yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";
import { ProsemirrorData } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Document, Event } from "@server/models";
import { sequelize } from "@server/storage/database";
import { AuthenticationType } from "@server/types";

type Props = {
  /** The document ID to update. */
  documentId: string;
  /** Current collaobrative state. */
  ydoc: Y.Doc;
  /** The user IDs that have modified the document since it was last persisted. */
  sessionCollaboratorIds: string[];
  /** Whether the last connection to the document left. */
  isLastConnection: boolean;
};

export default async function documentCollaborativeUpdater({
  documentId,
  ydoc,
  sessionCollaboratorIds,
  isLastConnection,
}: Props) {
  return sequelize.transaction(async (transaction) => {
    const document = await Document.unscoped()
      .scope("withoutState")
      .findOne({
        where: {
          id: documentId,
        },
        transaction,
        lock: {
          of: Document,
          level: transaction.LOCK.UPDATE,
        },
        rejectOnEmpty: true,
        paranoid: false,
      });

    const state = Y.encodeStateAsUpdate(ydoc);
    const content = yDocToProsemirrorJSON(ydoc, "default") as ProsemirrorData;
    const isUnchanged = isEqual(document.content, content);
    const lastModifiedById =
      sessionCollaboratorIds[sessionCollaboratorIds.length - 1] ??
      document.lastModifiedById;

    if (isUnchanged) {
      return;
    }

    Logger.info(
      "multiplayer",
      `Persisting ${documentId}, attributed to ${lastModifiedById}`
    );

    // extract collaborators from doc user data
    const pud = new Y.PermanentUserData(ydoc);
    const pudIds = Array.from(pud.clients.values());
    const collaboratorIds = uniq([
      ...document.collaboratorIds,
      ...sessionCollaboratorIds,
      ...pudIds,
    ]);

    await document.update(
      {
        content,
        state: Buffer.from(state),
        lastModifiedById,
        collaboratorIds,
      },
      {
        transaction,
        hooks: false,
      }
    );

    await Event.schedule({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: lastModifiedById,
      authType: AuthenticationType.APP,
      data: {
        multiplayer: true,
        title: document.title,
        done: isLastConnection,
      },
    });
  });
}
