import { QueryTypes } from "sequelize";
import { toError } from "@shared/utils/error";
import { APIUpdateExtension } from "@server/collaboration/APIUpdateExtension";
import { collaborationSessionExists } from "@server/collaboration/sessions";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { sequelize } from "@server/storage/database";

interface Props {
  /** The document ID to flatten. */
  documentId: string;
  /** The user that the notification to the collaboration server is from. */
  actorId: string;
  /** The document is not changed if it was updated after this time. */
  since: Date;
}

/**
 * Replace the collaborative state of an idle document with new state that has
 * no edit history, if the state is large and mostly history. Nothing changes
 * while a collaboration session is open. The state generation increments, and
 * any rooms of the earlier generation are closed so that their clients
 * connect again.
 *
 * @param props the document to flatten.
 * @returns a promise resolving to true if the state was replaced.
 */
export default async function documentStateFlattener({
  documentId,
  actorId,
  since,
}: Props): Promise<boolean> {
  // Read only the length first, most documents are far below the threshold.
  const [row] = await sequelize.query<{ length: number | null }>(
    `SELECT octet_length(state) AS length FROM documents WHERE id = :documentId`,
    { replacements: { documentId }, type: QueryTypes.SELECT }
  );
  if (!row?.length || row.length <= flattenStateLength) {
    return false;
  }

  const flattened = await sequelize.transaction(async (transaction) => {
    const document = await Document.unscoped().findOne({
      attributes: ["id", "state", "stateGeneration", "updatedAt"],
      where: { id: documentId },
      lock: transaction.LOCK.NO_KEY_UPDATE,
      transaction,
    });

    // A change after the given time means that the document is not idle.
    if (!document?.state || document.updatedAt > since) {
      return false;
    }

    // Users with the document open would see their editor reset.
    if (await collaborationSessionExists(documentId)) {
      return false;
    }

    const state = DocumentHelper.flatten(document);

    const minBytesSaved = Math.max(
      document.state.length * flattenMinFractionSaved,
      flattenMinBytesSaved
    );
    if (state.length + minBytesSaved >= document.state.length) {
      return false;
    }

    Logger.info(
      "multiplayer",
      `Flattened state of ${documentId} from ${document.state.length} to ${state.length} bytes`
    );

    await document.update(
      { state, stateGeneration: document.stateGeneration + 1 },
      { transaction, silent: true, hooks: false }
    );
    return true;
  });

  if (flattened) {
    // Clients of the earlier generation reconnect when they next save if this
    // fails, so the error is not fatal.
    try {
      await APIUpdateExtension.notifyUpdate(documentId, actorId);
    } catch (err) {
      Logger.error("Unable to notify collaboration server", toError(err), {
        documentId,
      });
    }
  }

  return flattened;
}

/** State above this length is replaced with state that has no edit history. */
const flattenStateLength = 250_000;

/** The minimum fraction of the length that the new state must save. */
const flattenMinFractionSaved = 0.2;

/** The minimum number of bytes that the new state must save. */
const flattenMinBytesSaved = 1_000;
