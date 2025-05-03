import Router from "koa-router";
import { QueryTypes } from "sequelize";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { OAuthAuthentication } from "@server/models";
import { authorize } from "@server/policies";
import { presentPolicies } from "@server/presenters";
import presentOAuthAuthentication from "@server/presenters/oauthAuthentication";
import { sequelize } from "@server/storage/database";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "oauthAuthentications.list",
  auth(),
  pagination(),
  validate(T.OAuthAuthenticationsListSchema),
  async (ctx: APIContext<T.OAuthAuthenticationsListReq>) => {
    const { user } = ctx.state.auth;

    const oauthAuthentications = await sequelize.query<OAuthAuthentication>(
      `
      SELECT DISTINCT ON (oa."oauthClientId", oa."scope")
        oa.*,
        oc.id AS "oauthClient.id",
        oc.name AS "oauthClient.name",
        oc."avatarUrl" AS "oauthClient.avatarUrl",
        oc."clientId" AS "oauthClient.clientId"
      FROM oauth_authentications oa
      INNER JOIN oauth_clients oc ON oc.id = oa."oauthClientId"
      WHERE oa."userId" = :userId
      AND oa."deletedAt" IS NULL
      ORDER BY oa."oauthClientId", oa."scope", oa."lastActiveAt", oa."createdAt" DESC
      LIMIT :limit OFFSET :offset
    `,
      {
        replacements: {
          userId: user.id,
          limit: ctx.state.pagination.limit,
          offset: ctx.state.pagination.offset,
        },
        type: QueryTypes.SELECT,
        nest: true,
      }
    );

    ctx.body = {
      pagination: { ...ctx.state.pagination },
      data: oauthAuthentications.map(presentOAuthAuthentication),
      policies: presentPolicies(user, oauthAuthentications),
    };
  }
);

router.post(
  "oauthAuthentications.delete",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth(),
  validate(T.OAuthAuthenticationsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.OAuthAuthenticationsDeleteReq>) => {
    const { user } = ctx.state.auth;
    const { oauthClientId, scope } = ctx.input.body;
    const oauthAuthentications = await OAuthAuthentication.findAll({
      where: {
        userId: user.id,
        oauthClientId,
        ...(scope ? { scope } : {}),
      },
      transaction: ctx.state.transaction,
    });

    for (const oauthAuthentication of oauthAuthentications) {
      authorize(user, "delete", oauthAuthentication);
      await oauthAuthentication.destroyWithCtx(ctx);
    }

    ctx.body = {
      success: true,
    };
  }
);

export default router;
