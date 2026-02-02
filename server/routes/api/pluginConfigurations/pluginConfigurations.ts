import Router from "koa-router";
import { UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { PluginConfiguration } from "@server/models";
import { authorize } from "@server/policies";
import { presentPluginConfiguration } from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import * as T from "./schema";

const router = new Router();

router.post(
  "pluginConfigurations.update",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth({ role: UserRole.Admin }),
  validate(T.PluginConfigurationsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.PluginConfigurationsUpdateReq>) => {
    const { pluginId, config } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createPluginConfiguration", user.team);

    let pluginConfig = await PluginConfiguration.findByPluginAndTeam(
      pluginId,
      user.teamId
    );

    if (pluginConfig) {
      pluginConfig.config = config;
      await pluginConfig.saveWithCtx(ctx);
    } else {
      pluginConfig = await PluginConfiguration.createWithCtx(ctx, {
        pluginId,
        config,
        teamId: user.teamId,
        createdById: user.id,
      });
    }

    ctx.body = {
      data: presentPluginConfiguration(pluginConfig),
    };
  }
);

router.post(
  "pluginConfigurations.info",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth({ role: UserRole.Admin }),
  validate(T.PluginConfigurationsInfoSchema),
  async (ctx: APIContext<T.PluginConfigurationsInfoReq>) => {
    const { pluginId } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createPluginConfiguration", user.team);

    const pluginConfig = await PluginConfiguration.findByPluginAndTeam(
      pluginId,
      user.teamId
    );

    if (!pluginConfig) {
      ctx.body = {
        data: null,
      };
      return;
    }

    ctx.body = {
      data: presentPluginConfiguration(pluginConfig),
    };
  }
);

export default router;
