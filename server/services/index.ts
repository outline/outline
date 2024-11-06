import admin from "./admin";
import collaboration from "./collaboration";
import cron from "./cron";
import web from "./web";
import websockets from "./websockets";
import worker from "./worker";

export default {
  websockets,
  collaboration,
  admin,
  web,
  worker,
  cron,
} as const;
