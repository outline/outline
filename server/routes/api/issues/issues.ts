import { InternalError, InvalidRequestError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { Integration } from "@server/models";
import presentUnfurl from "@server/presenters/unfurl";
import { APIContext } from "@server/types";
import { CacheHelper } from "@server/utils/CacheHelper";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import { IssueSource } from "@shared/schema";
import { UserRole } from "@shared/types";
import Router from "koa-router";
import * as T from "./schema";

const router = new Router();
const plugins = PluginManager.getHooks(Hook.IssueProvider);

router.post(
  "issues.list_sources",
  auth({ role: UserRole.Member }),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;

    const integrations = await Integration.findAll({
      attributes: ["issueSources"],
      where: { teamId: user.teamId },
    });

    const sources = integrations
      .flatMap((integration) => integration.issueSources)
      .filter(Boolean) as IssueSource[];

    ctx.body = {
      data: sources,
    };
  }
);

router.post(
  "issues.create",
  auth({ role: UserRole.Member }),
  validate(T.IssuesCreateSchema),
  async (ctx: APIContext<T.IssuesCreateReq>) => {
    const { title, source } = ctx.input.body;
    const { user } = ctx.state.auth;

    const plugin = plugins.find((p) => p.value.service === source.service);

    if (!plugin) {
      throw InvalidRequestError();
    }

    const issue = await plugin.value.createIssue(title, source, user);

    if (!issue) {
      throw InternalError();
    }

    await CacheHelper.setData(
      CacheHelper.getUnfurlKey(user.teamId, issue.cacheKey),
      issue,
      plugin.value.cacheExpiry
    );

    ctx.body = {
      data: await presentUnfurl(issue),
    };
  }
);

export default router;
