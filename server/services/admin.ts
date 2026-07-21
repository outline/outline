import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { KoaAdapter } from "@bull-board/koa";
import type Koa from "koa";
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
      new BullMQAdapter(globalEventQueue()),
      new BullMQAdapter(processorEventQueue()),
      new BullMQAdapter(websocketQueue()),
      new BullMQAdapter(taskQueue()),
    ],
    serverAdapter,
  });
  serverAdapter.setBasePath("/admin");
  app.use(serverAdapter.registerPlugin());
}
