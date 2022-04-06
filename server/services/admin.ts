import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { KoaAdapter } from "@bull-board/koa";
import Koa from "koa";
import {
  globalEventQueue,
  processorEventQueue,
  websocketQueue,
  taskQueue,
} from "../queues";

export default function init(app: Koa) {
  const serverAdapter = new KoaAdapter();
  createBullBoard({
    queues: [
      new BullAdapter(globalEventQueue),
      new BullAdapter(processorEventQueue),
      new BullAdapter(websocketQueue),
      new BullAdapter(taskQueue),
    ],
    serverAdapter,
  });
  serverAdapter.setBasePath("/admin");
  app.use(serverAdapter.registerPlugin());
}
