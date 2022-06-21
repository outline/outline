import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { NotFoundError } from "@server/errors";
import errorHandling from "@server/middlewares/errorHandling";
import methodOverride from "@server/middlewares/methodOverride";
import apiKeys from "./apiKeys";
import attachments from "./attachments";
import auth from "./auth";
import authenticationProviders from "./authenticationProviders";
import collections from "./collections";
import utils from "./cron";
import documents from "./documents";
import events from "./events";
import fileOperationsRoute from "./fileOperations";
import groups from "./groups";
import hooks from "./hooks";
import integrations from "./integrations";
import apiWrapper from "./middlewares/apiWrapper";
import editor from "./middlewares/editor";
import notificationSettings from "./notificationSettings";
import pins from "./pins";
import revisions from "./revisions";
import searches from "./searches";
import shares from "./shares";
import stars from "./stars";
import team from "./team";
import users from "./users";
import views from "./views";

const api = new Koa();
const router = new Router();

// middlewares
api.use(errorHandling());
api.use(
  bodyParser({
    multipart: true,
    formidable: {
      maxFieldsSize: 10 * 1024 * 1024,
    },
  })
);
api.use(methodOverride());
api.use(apiWrapper());
api.use(editor());

// routes
router.use("/", auth.routes());
router.use("/", authenticationProviders.routes());
router.use("/", events.routes());
router.use("/", users.routes());
router.use("/", collections.routes());
router.use("/", documents.routes());
router.use("/", pins.routes());
router.use("/", revisions.routes());
router.use("/", views.routes());
router.use("/", hooks.routes());
router.use("/", apiKeys.routes());
router.use("/", searches.routes());
router.use("/", shares.routes());
router.use("/", stars.routes());
router.use("/", team.routes());
router.use("/", integrations.routes());
router.use("/", notificationSettings.routes());
router.use("/", attachments.routes());
router.use("/", utils.routes());
router.use("/", groups.routes());
router.use("/", fileOperationsRoute.routes());

router.post("*", (ctx) => {
  ctx.throw(NotFoundError("Endpoint not found"));
});

// Router is embedded in a Koa application wrapper, because koa-router does not
// allow middleware to catch any routes which were not explicitly defined.
api.use(router.routes());

export default api;
