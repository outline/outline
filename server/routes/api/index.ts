import Koa, { BaseContext } from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import userAgent, { UserAgentContext } from "koa-useragent";
import env from "@server/env";
import { NotFoundError } from "@server/errors";
import coalesceBody from "@server/middlewares/coaleseBody";
import requestTracer from "@server/middlewares/requestTracer";
import { AppState, AppContext } from "@server/types";
import { Hook, PluginManager } from "@server/utils/PluginManager";
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
import groupMemberships from "./groupMemberships";
import groups from "./groups";
import imports from "./imports";
import installation from "./installation";
import integrations from "./integrations";
import apiErrorHandler from "./middlewares/apiErrorHandler";
import apiResponse from "./middlewares/apiResponse";
import editor from "./middlewares/editor";
import notifications from "./notifications";
import oauthAuthentications from "./oauthAuthentications";
import oauthClients from "./oauthClients";
import pins from "./pins";
import reactions from "./reactions";
import revisions from "./revisions";
import searches from "./searches";
import shares from "./shares";
import stars from "./stars";
import subscriptions from "./subscriptions";
import suggestions from "./suggestions";
import teams from "./teams";
import urls from "./urls";
import userMemberships from "./userMemberships";
import users from "./users";
import views from "./views";

const api = new Koa<AppState, AppContext>();
const router = new Router();

// middlewares
api.use(
  bodyParser({
    multipart: true,
    formidable: {
      maxFileSize: Math.max(
        env.FILE_STORAGE_UPLOAD_MAX_SIZE,
        env.FILE_STORAGE_IMPORT_MAX_SIZE
      ),
      maxFieldsSize: 10 * 1024 * 1024,
    },
  })
);
api.use(coalesceBody());
api.use<BaseContext, UserAgentContext>(userAgent);
api.use(requestTracer());
api.use(apiResponse());
api.use(apiErrorHandler());
api.use(editor());

// Register plugin API routes before others to allow for overrides
PluginManager.getHooks(Hook.API).forEach((hook) =>
  router.use("/", hook.value.routes())
);

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
router.use("/", suggestions.routes());
router.use("/", teams.routes());
router.use("/", integrations.routes());
router.use("/", notifications.routes());
router.use("/", oauthAuthentications.routes());
router.use("/", oauthClients.routes());
router.use("/", attachments.routes());
router.use("/", cron.routes());
router.use("/", groups.routes());
router.use("/", groupMemberships.routes());
router.use("/", fileOperationsRoute.routes());
router.use("/", urls.routes());
router.use("/", userMemberships.routes());
router.use("/", reactions.routes());
router.use("/", imports.routes());

if (!env.isCloudHosted) {
  router.use("/", installation.routes());
}

if (env.isDevelopment) {
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
