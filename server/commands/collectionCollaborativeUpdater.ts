import isEqual from "fast-deep-equal";
import { Node } from "prosemirror-model";
import { yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";
import type { ProsemirrorData } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import { Collection, Event } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { sequelize } from "@server/storage/database";
import { AuthenticationType } from "@server/types";

type Props = {
  /** The collection ID to update. */
  collectionId: string;
  /** Current collaborative state. */
  ydoc: Y.Doc;
  /** The user IDs that have modified the collection since it was last persisted. */
  sessionCollaboratorIds: string[];
  /** Whether the last connection to the collection left. */
  isLastConnection: boolean;
};

/**
 * Persists the collaborative editing state of a collection description to the
 * database, along with a snapshot of the content as JSON and Markdown.
 *
 * @param props The properties of the collection to update.
 */
export default async function collectionCollaborativeUpdater({
  collectionId,
  ydoc,
  sessionCollaboratorIds,
  isLastConnection,
}: Props) {
  return sequelize.transaction(async (transaction) => {
    await sequelize.query(`SET LOCAL lock_timeout = '15s';`, {
      transaction,
    });

    // the default scope excludes the large state and documentStructure
    // columns, neither of which need to be read here.
    const collection = await Collection.findOne({
      where: {
        id: collectionId,
      },
      transaction,
      lock: {
        of: Collection,
        level: transaction.LOCK.UPDATE,
      },
      rejectOnEmpty: true,
      paranoid: false,
    });

    const state = Y.encodeStateAsUpdate(ydoc);

    // Round-trip through the schema so the stored JSON is canonical. The raw
    // y-prosemirror output includes empty `attrs: {}` on every mark, and outputs
    // properties in a different order - resulting in spurious "edits"
    const node = Node.fromJSON(schema, yDocToProsemirrorJSON(ydoc, "default"));
    const content = node.toJSON() as ProsemirrorData;
    const isUnchanged = isEqual(collection.content, content);

    if (isUnchanged) {
      return;
    }

    const actorId =
      sessionCollaboratorIds[sessionCollaboratorIds.length - 1] ??
      collection.createdById;

    Logger.info(
      "multiplayer",
      `Persisting collection ${collectionId}, attributed to ${actorId}`
    );

    await collection.update(
      {
        content,
        description: ProsemirrorHelper.isEmptyData(content)
          ? null
          : await DocumentHelper.toMarkdown(content),
        state: Buffer.from(state),
      },
      {
        transaction,
        // Hooks MUST NOT be called as the BeforeSave hook would attempt to
        // derive the state from content again.
        hooks: false,
      }
    );

    await Event.schedule({
      name: "collections.update",
      collectionId: collection.id,
      teamId: collection.teamId,
      actorId,
      authType: AuthenticationType.APP,
      data: {
        multiplayer: true,
        name: collection.name,
        done: isLastConnection,
      },
    });
  });
}
