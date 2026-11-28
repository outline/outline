import { toError } from "@shared/utils/error";
import Logger from "@server/logging/Logger";
import RedisAdapter from "@server/storage/redis";

/**
 * The Redis key of the sorted set that records the instances with a
 * collaboration session open for a document. Each member is an instance ID,
 * scored by the time the record expires.
 *
 * @param documentId the ID of the document.
 * @returns the Redis key.
 */
export function collaborationSessionKey(documentId: string): string {
  return `collaboration:session:${documentId}`;
}

/**
 * Whether a collaboration session is open for the document on any instance.
 * If Redis can not be read, a session is assumed to be open.
 *
 * @param documentId the ID of the document.
 * @returns a promise resolving to true if a session is open.
 */
export async function collaborationSessionExists(
  documentId: string
): Promise<boolean> {
  try {
    const count = await RedisAdapter.collaborationClient.zcount(
      collaborationSessionKey(documentId),
      Date.now(),
      "+inf"
    );
    return count > 0;
  } catch (err) {
    Logger.warn("Unable to read collaboration sessions", {
      documentId,
      message: toError(err).message,
    });
    return true;
  }
}
