// @flow
import debug from "debug";

const log = debug("server");

export default class Logger {
  async onCreateDocument(data: { documentName: string }) {
    log(`Created document "${data.documentName}"`);
  }

  async onConnect(data: { documentName: string }) {
    log(`New connection to "${data.documentName}"`);
  }

  async onDisconnect(data: { documentName: string }) {
    log(`Connection to "${data.documentName}" closed`);
  }

  async onUpgrade() {
    log("Upgrading connection");
  }
}
