// @flow
import http from "http";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { KoaAdapter } from "@bull-board/koa";
import Koa from "koa";
import {
  emailsQueue,
  globalEventQueue,
  processorEventQueue,
  websocketsQueue,
} from "../queues";

export default function init(app: Koa, server?: http.Server) {
  const serverAdapter = new KoaAdapter();
  createBullBoard({
    queues: [
      new BullAdapter(globalEventQueue),
      new BullAdapter(processorEventQueue),
      new BullAdapter(emailsQueue),
      new BullAdapter(websocketsQueue),
    ],
    serverAdapter,
  });

  serverAdapter.setBasePath("/admin");
  app.use(serverAdapter.registerPlugin());
}
