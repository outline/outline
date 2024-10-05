import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { presentInstallationInfo } from "@server/presenters";
import { APIContext } from "@server/types";
import {
  getVersion,
  getLatestVersion,
  getVersionsBehind,
} from "@server/utils/getInstallationInfo";
import * as T from "./schema";

const router = new Router();

router.post(
  "installation.info",
  auth(),
  validate(T.InstallationInfoSchema),
  async (ctx: APIContext) => {
    const currentVersion = getVersion();
    const latestVersion = await getLatestVersion();
    const versionsBehind = await getVersionsBehind(currentVersion);

    ctx.body = {
      data: presentInstallationInfo({
        version: currentVersion,
        latestVersion,
        versionsBehind,
      }),
      policies: [],
    };
  }
);

export default router;
