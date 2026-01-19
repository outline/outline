import type {
  Extension,
  afterLoadDocumentPayload,
  onConfigurePayload,
  onDestroyPayload,
  onDisconnectPayload,
} from "@hocuspocus/server";
import type { Document as HocuspocusDocument } from "@hocuspocus/server";
import * as Y from "yjs";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import Document from "@server/models/Document";
import RedisAdapter from "@server/storage/redis";

/**
 * Redis channel prefix for API update notifications.
 */
const CHANNEL_PREFIX = "collaboration:api-update";

/**
 * Extension that listens for document updates made through the API and syncs
 * them to the collaborative editing state held in memory.
 *
 * When a document is updated via the API (e.g., documents.update endpoint),
 * a message is published to Redis. This extension receives that message and
 * reloads the document state from the database, then broadcasts the update
 * to all connected clients.
 */
@trace()
export class APIUpdateExtension implements Extension {
  /**
   * Map of document names to their Hocuspocus Document instances.
   */
  private documents: Map<string, HocuspocusDocument> = new Map();

  /**
   * Redis subscriber client for receiving update notifications.
   */
  private subscriber: RedisAdapter | null = null;

  /**
   * Whether the extension has been configured.
   */
  private configured = false;

  async onConfigure(_data: onConfigurePayload): Promise<void> {
    if (this.configured) {
      return;
    }
    this.configured = true;

    try {
      // Create a dedicated subscriber for API update notifications
      this.subscriber = new RedisAdapter(
        env.REDIS_COLLABORATION_URL || env.REDIS_URL,
        {
          connectionNameSuffix: "collab-api-updates",
          maxRetriesPerRequest: null,
        }
      );

      // Handle Redis connection errors
      this.subscriber.on("error", (err) => {
        Logger.error("Redis subscriber error in APIUpdateExtension", err);
      });

      // Subscribe to the API update channel pattern
      this.subscriber.psubscribe(`${CHANNEL_PREFIX}:*`, (err) => {
        if (err) {
          Logger.error("Failed to subscribe to API update channel", err);
          return;
        }
        Logger.debug(
          "multiplayer",
          `Subscribed to ${CHANNEL_PREFIX}:* for API updates`
        );
      });

      // Handle incoming messages
      this.subscriber.on("pmessage", this.handleMessage);
    } catch (error) {
      Logger.error(
        "Failed to configure APIUpdateExtension Redis subscriber",
        error as Error
      );
      this.subscriber = null;
      this.configured = false;
    }
  }

  async afterLoadDocument({
    documentName,
    document,
  }: afterLoadDocumentPayload): Promise<void> {
    const [, documentId] = documentName.split(".");
    this.documents.set(documentId, document);
  }

  async onDestroy(_data: onDestroyPayload): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.punsubscribe(`${CHANNEL_PREFIX}:*`);
      await this.subscriber.quit();
      this.subscriber = null;
    }
    this.documents.clear();
  }

  /**
   * Handle a document being disconnected (no more clients).
   */
  async onDisconnect({
    documentName,
    clientsCount,
  }: onDisconnectPayload): Promise<void> {
    if (clientsCount === 0) {
      const [, documentId] = documentName.split(".");
      this.documents.delete(documentId);
    }
  }

  /**
   * Handle incoming Redis messages for API updates.
   */
  private handleMessage = async (
    _pattern: string,
    channel: string,
    message: string
  ): Promise<void> => {
    try {
      const documentId = channel.replace(`${CHANNEL_PREFIX}:`, "");
      const document = this.documents.get(documentId);

      if (!document) {
        // Document not loaded in this instance, ignore
        return;
      }

      const data = JSON.parse(message);

      Logger.debug("multiplayer", `Received API update for document`, {
        documentId,
        actorId: data.actorId,
      });

      // Fetch the latest state from the database
      const dbDocument = await Document.unscoped().findOne({
        attributes: ["state", "content", "text"],
        where: { id: documentId },
      });

      if (!dbDocument) {
        Logger.warn(`Document ${documentId} not found in database`);
        return;
      }

      if (!dbDocument.state) {
        Logger.warn(`Document ${documentId} has no state in database`);
        return;
      }

      // Create a Y.Doc from the database state
      const dbYdoc = new Y.Doc();
      Y.applyUpdate(dbYdoc, dbDocument.state);

      // Calculate the diff between the current in-memory state and the database state
      const currentStateVector = Y.encodeStateVector(document);
      const update = Y.encodeStateAsUpdate(dbYdoc, currentStateVector);

      // Apply the update if there are changes
      if (update.length > 0) {
        Y.applyUpdate(document, update);

        Logger.info("multiplayer", `Applied API update to document`, {
          documentId,
          updateSize: update.length,
        });
      }

      dbYdoc.destroy();
    } catch (error) {
      Logger.error("Failed to process API update message", error as Error);
    }
  };

  /**
   * Publish a notification that a document was updated via the API.
   * This should be called from the document update command.
   *
   * @param documentId - the id of the document that was updated.
   * @param actorId - the id of the user who made the update.
   */
  static async notifyUpdate(
    documentId: string,
    actorId: string
  ): Promise<void> {
    const channel = `${CHANNEL_PREFIX}:${documentId}`;
    const message = JSON.stringify({
      actorId,
      timestamp: Date.now(),
    });

    await RedisAdapter.defaultClient.publish(channel, message);

    Logger.debug("multiplayer", `Published API update notification`, {
      documentId,
      actorId,
    });
  }
}
