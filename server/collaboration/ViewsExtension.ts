import {
  Extension,
  onAwarenessUpdatePayload,
  onDisconnectPayload,
} from "@hocuspocus/server";
import { Second } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { View } from "@server/models";

@trace()
export class ViewsExtension implements Extension {
  /**
   * Map of documentId -> intervals
   */
  intervalsBySocket: Map<string, NodeJS.Timer> = new Map();

  /**
   * onAwarenessUpdate hook
   * @param data The awareness payload
   */
  async onAwarenessUpdate({
    documentName,
    // @ts-expect-error Hocuspocus types are wrong
    connection,
    context,
    socketId,
  }: onAwarenessUpdatePayload) {
    if (this.intervalsBySocket.get(socketId)) {
      return;
    }

    const [, documentId] = documentName.split(".");

    const updateView = async () => {
      Logger.debug(
        "multiplayer",
        `Updating last viewed at for "${documentName}"`
      );
      try {
        await View.touch(documentId, context.user.id, !connection.readOnly);
      } catch (err) {
        Logger.error(
          `Failed to update last viewed at for "${documentName}"`,
          err,
          {
            documentId,
            userId: context.user.id,
          }
        );
      }
    };

    // Set up an interval to update the last viewed at timestamp continuously
    // while the user is connected. This should only be done once per socket.

    const interval = setInterval(updateView, 30 * Second);
    updateView();

    this.intervalsBySocket.set(socketId, interval);
  }

  /**
   * onDisconnect hook
   * @param data The disconnect payload
   */
  async onDisconnect({ socketId }: onDisconnectPayload) {
    const interval = this.intervalsBySocket.get(socketId);
    if (interval) {
      clearInterval(interval);
      this.intervalsBySocket.delete(socketId);
    }
  }
}
