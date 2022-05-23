import {
  onConnectPayload,
  onDisconnectPayload,
  onLoadDocumentPayload,
  Extension,
} from "@hocuspocus/server";
import Logger from "@server/logging/Logger";

export default class LoggerExtension implements Extension {
  async onLoadDocument(data: onLoadDocumentPayload) {
    Logger.info("hocuspocus", `Loaded document "${data.documentName}"`, {
      userId: data.context.user?.id,
    });
  }

  async onConnect(data: onConnectPayload) {
    Logger.info("hocuspocus", `New connection to "${data.documentName}"`);
  }

  async onDisconnect(data: onDisconnectPayload) {
    Logger.info("hocuspocus", `Closed connection to "${data.documentName}"`, {
      userId: data.context.user?.id,
    });
  }
}
