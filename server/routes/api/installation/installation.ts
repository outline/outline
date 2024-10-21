import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { APIContext } from "@server/types";
import {
  getVersion,
  getLatestVersion,
  getVersionsBehind,
} from "@server/utils/getInstallationInfo";

const router = new Router();

router.post("installation.info", auth(), async (ctx: APIContext) => {
  const currentVersion = getVersion();
  const latestVersion = await getLatestVersion();
  const versionsBehind = await getVersionsBehind(currentVersion);

  ctx.body = {
    data: {
      version: currentVersion,
      latestVersion,
      versionsBehind,
    },
    policies: [],
  };
});

export default router;
