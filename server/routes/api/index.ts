import path from "path";
import glob from "glob";
import Koa, { BaseContext } from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import userAgent, { UserAgentContext } from "koa-useragent";
import env from "@server/env";
import { NotFoundError } from "@server/errors";
import Logger from "@server/logging/Logger";
import coalesceBody from "@server/middlewares/coaleseBody";
import { AppState, AppContext } from "@server/types";
import apiKeys from "./apiKeys";
import attachments from "./attachments";
import auth from "./auth";
import authenticationProviders from "./authenticationProviders";
import collections from "./collections";
import comments from "./comments/comments";
import cron from "./cron";
import developer from "./developer";
import documents from "./documents";
import events from "./events";
import fileOperationsRoute from "./fileOperations";
import groups from "./groups";
import integrations from "./integrations";
import apiWrapper from "./middlewares/apiWrapper";
import editor from "./middlewares/editor";
import notifications from "./notifications";
import pins from "./pins";
import revisions from "./revisions";
import searches from "./searches";
import shares from "./shares";
import stars from "./stars";
import subscriptions from "./subscriptions";
import teams from "./teams";
import urls from "./urls";
import users from "./users";
import views from "./views";

const api = new Koa<AppState, AppContext>();
const router = new Router();

// middlewares
api.use(
  bodyParser({
    multipart: true,
    formidable: {
      maxFieldsSize: 10 * 1024 * 1024,
    },
  })
);
api.use(coalesceBody());
api.use<BaseContext, UserAgentContext>(userAgent);
api.use(apiWrapper());
api.use(editor());

// register package API routes before others to allow for overrides
const rootDir = env.ENVIRONMENT === "test" ? "" : "build";
glob
  .sync(path.join(rootDir, "plugins/*/server/api/!(*.test).[jt]s"))
  .forEach((filePath: string) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg: Router = require(path.join(process.cwd(), filePath)).default;

    if (pkg && "routes" in pkg) {
      router.use("/", pkg.routes());
      Logger.debug("lifecycle", `Registered API routes for ${filePath}`);
    }
  });

// routes
router.use("/", auth.routes());
router.use("/", authenticationProviders.routes());
router.use("/", events.routes());
router.use("/", users.routes());
router.use("/", collections.routes());
router.use("/", comments.routes());
router.use("/", documents.routes());
router.use("/", pins.routes());
router.use("/", revisions.routes());
router.use("/", views.routes());
router.use("/", apiKeys.routes());
router.use("/", searches.routes());
router.use("/", shares.routes());
router.use("/", stars.routes());
router.use("/", subscriptions.routes());
router.use("/", teams.routes());
router.use("/", integrations.routes());
router.use("/", notifications.routes());
router.use("/", attachments.routes());
router.use("/", cron.routes());
router.use("/", groups.routes());
router.use("/", fileOperationsRoute.routes());
router.use("/", urls.routes());

if (env.ENVIRONMENT === "development") {
  router.use("/", developer.routes());
}

router.post("*", (ctx) => {
  ctx.throw(NotFoundError("Endpoint not found"));
});

router.get("*", (ctx) => {
  ctx.throw(NotFoundError("Endpoint not found"));
});

// Router is embedded in a Koa application wrapper, because koa-router does not
// allow middleware to catch any routes which were not explicitly defined.
api.use(router.routes());
api.use(router.allowedMethods());

export default api;
