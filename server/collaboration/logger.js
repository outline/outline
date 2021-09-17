// @flow
import Logger from "../logging/logger";
export default class CollaborationLogger {
  async onCreateDocument(data: { documentName: string }) {
    Logger.info("hocuspocus", `Created document "${data.documentName}"`);
  }

  async onConnect(data: { documentName: string }) {
    Logger.info("hocuspocus", `New connection to "${data.documentName}"`);
  }

  async onDisconnect(data: { documentName: string }) {
    Logger.info("hocuspocus", `Connection to "${data.documentName}" closed`);
  }

  async onUpgrade() {
    Logger.info("hocuspocus", "Upgrading connection");
  }
}
