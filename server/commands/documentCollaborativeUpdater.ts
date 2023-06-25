import { yDocToProsemirrorJSON } from "@getoutline/y-prosemirror";
import { uniq } from "lodash";
import { Node } from "prosemirror-model";
import * as Y from "yjs";
import { sequelize } from "@server/database/sequelize";
import { schema, serializer } from "@server/editor";
import Logger from "@server/logging/Logger";
import { Document, Event } from "@server/models";

type Props = {
  /** The document ID to update */
  documentId: string;
  /** Current collaobrative state */
  ydoc: Y.Doc;
  /** The user ID that is performing the update, if known */
  userId?: string;
  /** Whether the last connection to the document left */
  isLastConnection: boolean;
};

export default async function documentCollaborativeUpdater({
  documentId,
  ydoc,
  userId,
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
    const node = Node.fromJSON(schema, yDocToProsemirrorJSON(ydoc, "default"));
    const text = serializer.serialize(node, undefined);
    const isUnchanged = document.text === text;
    const lastModifiedById = userId ?? document.lastModifiedById;

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
    const collaboratorIds = uniq([...document.collaboratorIds, ...pudIds]);

    await document.update(
      {
        text,
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
      data: {
        multiplayer: true,
        title: document.title,
        done: isLastConnection,
      },
    });
  });
}
