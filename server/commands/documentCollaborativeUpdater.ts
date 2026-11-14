import isEqual from "fast-deep-equal";
import { uniq } from "es-toolkit/compat";
import { Node } from "prosemirror-model";
import { yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";
import type { ProsemirrorData } from "@shared/types";
import { toError } from "@shared/utils/error";
import { DocumentValidation } from "@shared/validations";
import { schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import { Document, Event } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { sequelize } from "@server/storage/database";
import { afterCommit } from "@server/storage/transaction";
import { AuthenticationType } from "@server/types";
import semver from "semver";

/** The result of persisting a collaborative document snapshot. */
export interface CollaborativeUpdateResult {
  /** Whether connected clients must discard their state and connect again. */
  reset: boolean;
}

interface Props {
  /** The document ID to update. */
  documentId: string;
  /** The generation of the collaborative state that the snapshot belongs to. */
  stateGeneration: number;
  /** Current collaborative state. */
  ydoc: Y.Doc;
  /** The collaborators and sequence associated with this snapshot. */
  collaborators: CollaboratorSnapshot;
  /** Whether the last connection to the document left. */
  isLastConnection: boolean;
  /** The client version, if available. */
  clientVersion: string | null;
}

interface CollaboratorSnapshot {
  /** The user IDs in edit order, with the snapshot's last editor last. */
  ids: string[];
  /** The latest collaborator sequence included in the snapshot, if available. */
  sequence?: number;
}

/**
 * Persist a collaborative document snapshot and its editing user. If the
 * state is over the maximum length, it is replaced with new state that has no
 * edit history, and the state generation increments.
 *
 * @param props the snapshot and attribution to persist.
 * @returns a promise resolving to the result of the update.
 */
export default async function documentCollaborativeUpdater({
  documentId,
  stateGeneration,
  ydoc,
  collaborators,
  isLastConnection,
  clientVersion,
}: Props): Promise<CollaborativeUpdateResult> {
  const state = Y.encodeStateAsUpdate(ydoc);

  // Round-trip through the schema so the stored JSON is canonical. The raw
  // y-prosemirror output includes empty `attrs: {}` on every mark, and outputs
  // properties in a different order - resulting in spurious "edits". The JSON
  // round-trip additionally drops undefined-valued attrs, which are absent
  // from previously stored content but present on `Node.toJSON` output.
  const content = JSON.parse(
    JSON.stringify(
      Node.fromJSON(schema, yDocToProsemirrorJSON(ydoc, "default")).toJSON()
    )
  ) as ProsemirrorData;

  // extract collaborators from doc user data
  const pud = new Y.PermanentUserData(ydoc);
  const pudIds = Array.from(pud.clients.values());

  // State over the maximum length can not be saved. Edit history can make the
  // state much larger than the content, so replace it with new state built
  // from the content. Large state under the maximum is replaced when the
  // document is idle, see documentStateFlattener.
  let flattenedState: Buffer | undefined;
  if (state.length > DocumentValidation.maxStateLength) {
    const flattened = ProsemirrorHelper.flatten(content);
    if (flattened.length <= DocumentValidation.maxStateLength) {
      flattenedState = flattened;
    }
  }

  return sequelize.transaction(async (transaction) => {
    await sequelize.query(`SET LOCAL lock_timeout = '15s';`, {
      transaction,
    });

    // Only the columns read below are selected, the deprecated markdown text
    // and collaborative state can each be megabytes and are not needed here.
    const document = await Document.unscoped().findOne({
      attributes: [
        "id",
        "title",
        "content",
        "collaboratorIds",
        "collectionId",
        "deletedAt",
        "editorVersion",
        "lastModifiedById",
        "revisionCount",
        "stateGeneration",
        "teamId",
      ],
      where: {
        id: documentId,
      },
      transaction,
      lock: {
        of: Document,
        level: transaction.LOCK.NO_KEY_UPDATE,
      },
      rejectOnEmpty: true,
      paranoid: false,
    });

    // The state of an earlier generation must not overwrite the current state.
    if (document.stateGeneration !== stateGeneration) {
      Logger.info(
        "multiplayer",
        `Not persisting ${documentId}, state generation ${stateGeneration} is not current`
      );
      return { reset: true };
    }

    const isUnchanged = isEqual(document.content, content);
    const isDeleted = !!document.deletedAt;
    const lastModifiedById = isDeleted
      ? document.lastModifiedById
      : (collaborators.ids[collaborators.ids.length - 1] ??
        document.lastModifiedById);

    if (isUnchanged) {
      return { reset: false };
    }

    Logger.info(
      "multiplayer",
      `Persisting ${documentId}, attributed to ${lastModifiedById}`
    );

    const collaboratorIds = uniq([
      ...(document.collaboratorIds ?? []),
      lastModifiedById,
      ...collaborators.ids,
      ...pudIds,
    ]);

    // Either the client or server version could be null, or they could both be
    // set. In that case we want to use the greater (newer) version.
    const editorVersion =
      document.editorVersion && clientVersion
        ? semver.gt(clientVersion, document.editorVersion)
          ? clientVersion
          : document.editorVersion
        : clientVersion
          ? clientVersion
          : document.editorVersion;

    await document.update(
      {
        content,
        state: flattenedState ?? Buffer.from(state),
        stateGeneration: flattenedState
          ? document.stateGeneration + 1
          : document.stateGeneration,
        lastModifiedById,
        collaboratorIds,
        editorVersion,
        // Hooks are disabled below, so the revision increment that normally
        // happens in BeforeUpdate must be applied manually.
        revisionCount: document.revisionCount + 1,
      },
      {
        transaction,
        // Hooks MUST NOT be called or the AfterUpdate hook in Document model may
        // result in infinite processing.
        hooks: false,
      }
    );

    await afterCommit(transaction, async () => {
      try {
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
            collaborators: collaborators.sequence,
          },
        });
      } catch (err) {
        Logger.error("Unable to schedule document update event", toError(err), {
          documentId,
        });
      }
    });

    if (flattenedState) {
      Logger.info(
        "multiplayer",
        `Flattened state of ${documentId} from ${state.length} to ${flattenedState.length} bytes`
      );
    }

    return { reset: !!flattenedState };
  });
}
