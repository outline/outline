import { randomUUID } from "node:crypto";
import type {
  Extension,
  Hocuspocus,
  connectedPayload,
  onConfigurePayload,
  onDisconnectPayload,
} from "@hocuspocus/server";
import { parseDocumentName } from "@shared/collaboration/documentName";
import { toError } from "@shared/utils/error";
import { Minute, Second } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import FlattenDocumentStateTask from "@server/queues/tasks/FlattenDocumentStateTask";
import RedisAdapter from "@server/storage/redis";
import { collaborationSessionKey } from "./sessions";
import type { withContext } from "./types";

/**
 * Records which documents have a collaboration session open on any instance,
 * so that background work can wait until nobody has the document open. See
 * collaborationSessionExists.
 */
@trace()
export class SessionExtension implements Extension {
  async onConfigure({ instance }: onConfigurePayload) {
    this.instance = instance;
    this.refreshInterval ??= setInterval(
      this.handleRefreshInterval,
      SessionExtension.refreshInterval
    ).unref();
  }

  async connected({ documentName }: connectedPayload) {
    const parts = parseDocumentName(documentName);
    if (parts) {
      await this.add([parts.documentId]);
    }
  }

  /**
   * Remove the session when the last connection to the document leaves this
   * instance, and schedule the state of the document to be flattened.
   *
   * @param data the disconnect payload.
   * @returns a promise resolving when the session is removed.
   */
  async onDisconnect({
    documentName,
    clientsCount,
    context,
  }: withContext<onDisconnectPayload>) {
    const parts = parseDocumentName(documentName);
    if (clientsCount > 0 || !parts) {
      return;
    }

    // A room of another state generation can be open for the same document.
    if (this.loadedDocumentIds(documentName).has(parts.documentId)) {
      return;
    }

    try {
      await RedisAdapter.collaborationClient.zrem(
        collaborationSessionKey(parts.documentId),
        this.instanceId
      );
    } catch (err) {
      Logger.warn("Unable to remove collaboration session", {
        documentId: parts.documentId,
        message: toError(err).message,
      });
    }

    if (context.user) {
      await new FlattenDocumentStateTask().scheduleOptional(
        {
          documentId: parts.documentId,
          actorId: context.user.id,
        },
        { delay: Minute.ms }
      );
    }
  }

  async onDestroy() {
    clearInterval(this.refreshInterval);
    this.refreshInterval = undefined;
  }

  /** How long a session is recorded without a refresh, in milliseconds. */
  private static ttl = 90 * Second.ms;

  /** How often the sessions of loaded documents are refreshed, in milliseconds. */
  private static refreshInterval = 30 * Second.ms;

  /** Identifies this instance in the session records. */
  private instanceId = randomUUID();

  private instance?: Hocuspocus;

  private refreshInterval?: ReturnType<typeof setInterval>;

  private handleRefreshInterval = () => {
    void this.add(Array.from(this.loadedDocumentIds()));
  };

  /**
   * The IDs of the documents loaded on this instance with connections.
   *
   * @param exceptName the name of a room to leave out.
   * @returns the document IDs.
   */
  private loadedDocumentIds(exceptName?: string): Set<string> {
    const documentIds = new Set<string>();

    for (const [name, document] of this.instance?.documents ?? []) {
      const parts = parseDocumentName(name);
      if (parts && name !== exceptName && document.getConnectionsCount() > 0) {
        documentIds.add(parts.documentId);
      }
    }

    return documentIds;
  }

  private async add(documentIds: string[]) {
    if (!documentIds.length) {
      return;
    }

    const expiresAt = Date.now() + SessionExtension.ttl;
    const pipeline = RedisAdapter.collaborationClient.pipeline();

    for (const documentId of documentIds) {
      const key = collaborationSessionKey(documentId);
      pipeline.zadd(key, expiresAt, this.instanceId);
      pipeline.zremrangebyscore(key, "-inf", Date.now());
      pipeline.pexpire(key, SessionExtension.ttl);
    }

    try {
      await pipeline.exec();
    } catch (err) {
      Logger.warn("Unable to record collaboration sessions", {
        message: toError(err).message,
      });
    }
  }
}
