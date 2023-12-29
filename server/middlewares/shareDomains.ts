import { Context, Next } from "koa";
import { Op } from "sequelize";
import { parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import { Share } from "@server/models";

export default function shareDomains() {
  return async function shareDomainsMiddleware(ctx: Context, next: Next) {
    const isCustomDomain = parseDomain(ctx.host).custom;

    if (env.isDevelopment || (isCustomDomain && env.isCloudHosted)) {
      const share = await Share.unscoped().findOne({
        where: {
          domain: ctx.hostname,
          published: true,
          revokedAt: {
            [Op.is]: null,
          },
        },
      });
      ctx.state.rootShare = share;
    }

    return next();
  };
}
