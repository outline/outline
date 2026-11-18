import type {
  Extension,
  onDisconnectPayload,
  onChangePayload,
} from "@hocuspocus/server";
import { Minute } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import { View } from "@server/models";
import { optionalWrite } from "@server/storage/database";
import type { withContext } from "./types";

@trace()
export class ViewsExtension implements Extension {
  /**
   * Map of last view recorded by socket
   */
  lastViewBySocket: Map<string, Date> = new Map();

  /**
   * onChange hook. When a user changes a document, we update their "viewedAt"
   * timestamp if it's been more than a minute since their last change.
   *
   * @param data The change payload
   */
  async onChange({
    documentName,
    context,
    socketId,
  }: withContext<onChangePayload>) {
    const { user } = context;
    if (!user) {
      return;
    }

    const lastUpdate = this.lastViewBySocket.get(socketId);
    const [, documentId] = documentName.split(".");

    if (!lastUpdate || Date.now() - lastUpdate.getTime() > Minute.ms) {
      this.lastViewBySocket.set(socketId, new Date());

      Logger.debug("multiplayer", `User ${user.id} viewed "${documentName}"`);
      await optionalWrite(() =>
        Promise.all([
          View.touch(documentId, user.id, true),
          user.updateActiveAt(),
        ])
      );
    }
  }

  /**
   * onDisconnect hook. When a user disconnects, we remove their socket from
   * the lastViewBySocket map to cleanup memory.
   *
   * @param data The disconnect payload
   */
  async onDisconnect({ socketId }: onDisconnectPayload) {
    const interval = this.lastViewBySocket.get(socketId);
    if (interval) {
      this.lastViewBySocket.delete(socketId);
    }
  }

  /**
   * onDestroy hook
   * @param data The destroy payload
   */
  async onDestroy() {
    this.lastViewBySocket = new Map();
  }
}
