import {
  onConnectPayload,
  onDisconnectPayload,
  onLoadDocumentPayload,
} from "@hocuspocus/server";
import Logger from "@server/logging/logger";

export default class CollaborationLogger {
  async onLoadDocument(data: onLoadDocumentPayload) {
    Logger.info("hocuspocus", `Loaded document "${data.documentName}"`, {
      userId: data.context.user.id,
    });
  }

  async onConnect(data: onConnectPayload) {
    Logger.info("hocuspocus", `New connection to "${data.documentName}"`);
  }

  async onDisconnect(data: onDisconnectPayload) {
    Logger.info("hocuspocus", `Connection to "${data.documentName}" closed `);
  }
}
