import {
  onDisconnectPayload,
  onLoadDocumentPayload,
  Extension,
  connectedPayload,
  onConnectPayload,
} from "@hocuspocus/server";
import Logger from "@server/logging/Logger";
import { withContext } from "./types";

export default class LoggerExtension implements Extension {
  async onLoadDocument(data: withContext<onLoadDocumentPayload>) {
    Logger.info("multiplayer", `Loaded document "${data.documentName}"`, {
      userId: data.context.user?.id,
    });
  }

  async onConnect(data: withContext<onConnectPayload>) {
    Logger.info("multiplayer", `New connection to "${data.documentName}"`);
  }

  async connected(data: withContext<connectedPayload>) {
    Logger.info(
      "multiplayer",
      `Authenticated connection to "${data.documentName}"`
    );
  }

  async onDisconnect(data: withContext<onDisconnectPayload>) {
    Logger.info("multiplayer", `Closed connection to "${data.documentName}"`, {
      userId: data.context.user?.id,
    });
  }
}
