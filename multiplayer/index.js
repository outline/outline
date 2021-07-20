// @flow
import { RocksDB } from "@hocuspocus/extension-rocksdb";
import { Server } from "@hocuspocus/server";

const server = Server.configure({
  port: process.env.PORT || 80,

  async onConnect() {
    console.log("🔮");
  },

  extensions: [
    new RocksDB({
      path: "./database",
    }),
  ],
});

server.listen();
