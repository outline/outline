// @flow
import Logger from "../logging/logger";
export default class CollaborationLogger {
  async onCreateDocument(data: { documentName: string }) {
    Logger.info("collaboration", `Created document "${data.documentName}"`);
  }

  async onConnect(data: { documentName: string }) {
    Logger.info("collaboration", `New connection to "${data.documentName}"`);
  }

  async onDisconnect(data: { documentName: string }) {
    Logger.info("collaboration", `Connection to "${data.documentName}" closed`);
  }

  async onUpgrade() {
    Logger.info("collaboration", "Upgrading connection");
  }
}
