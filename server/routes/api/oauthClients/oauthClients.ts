import Router from "koa-router";
import { UserRole } from "@shared/types";
import { ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { OAuthClient } from "@server/models";
import { authorize } from "@server/policies";
import {
  presentPolicies,
  presentOAuthClient,
  presentPublishedOAuthClient,
} from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "oauthClients.list",
  auth({ role: UserRole.Admin }),
  pagination(),
  validate(T.OAuthClientsListSchema),
  async (ctx: APIContext<T.OAuthClientsListReq>) => {
    const { user } = ctx.state.auth;
    const where = { teamId: user.teamId };

    const [oauthClients, total] = await Promise.all([
      OAuthClient.findAll({
        where,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      OAuthClient.count({ where }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: oauthClients.map(presentOAuthClient),
      policies: presentPolicies(user, oauthClients),
    };
  }
);
router.post(
  "oauthClients.info",
  auth(),
  validate(T.OAuthClientsInfoSchema),
  async (ctx: APIContext<T.OAuthClientsInfoReq>) => {
    const { id, clientId, redirectUri } = ctx.input.body;
    const { user } = ctx.state.auth;

    const oauthClient = await OAuthClient.findOne({
      where: clientId ? { clientId } : { id },
      rejectOnEmpty: true,
    });
    authorize(user, "read", oauthClient);

    if (redirectUri && !oauthClient.redirectUris.includes(redirectUri)) {
      throw ValidationError("redirect_uri is invalid");
    }

    const isInternalApp = oauthClient.teamId === user.teamId;

    ctx.body = {
      data: isInternalApp
        ? presentOAuthClient(oauthClient)
        : presentPublishedOAuthClient(oauthClient),
      policies: isInternalApp ? presentPolicies(user, [oauthClient]) : [],
    };
  }
);

router.post(
  "oauthClients.create",
  rateLimiter(RateLimiterStrategy.FivePerHour),
  auth({ role: UserRole.Admin }),
  validate(T.OAuthClientsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.OAuthClientsCreateReq>) => {
    const input = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createOAuthClient", user.team);

    const oauthClient = await OAuthClient.createWithCtx(ctx, {
      ...input,
      teamId: user.teamId,
      createdById: user.id,
    });

    ctx.body = {
      data: presentOAuthClient(oauthClient),
      policies: presentPolicies(user, [oauthClient]),
    };
  }
);

router.post(
  "oauthClients.update",
  auth({ role: UserRole.Admin }),
  validate(T.OAuthClientsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.OAuthClientsUpdateReq>) => {
    const { id, ...input } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const oauthClient = await OAuthClient.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      rejectOnEmpty: true,
    });
    authorize(user, "update", oauthClient);

    await oauthClient.updateWithCtx(ctx, input);

    ctx.body = {
      data: presentOAuthClient(oauthClient),
      policies: presentPolicies(user, [oauthClient]),
    };
  }
);

router.post(
  "oauthClients.rotate_secret",
  rateLimiter(RateLimiterStrategy.FivePerHour),
  auth({ role: UserRole.Admin }),
  validate(T.OAuthClientsRotateSecretSchema),
  transaction(),
  async (ctx: APIContext<T.OAuthClientsRotateSecretReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const oauthClient = await OAuthClient.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      rejectOnEmpty: true,
    });
    authorize(user, "update", oauthClient);

    oauthClient.rotateClientSecret();
    await oauthClient.saveWithCtx(ctx);

    ctx.body = {
      data: presentOAuthClient(oauthClient),
      policies: presentPolicies(user, [oauthClient]),
    };
  }
);

router.post(
  "oauthClients.delete",
  auth({ role: UserRole.Admin }),
  validate(T.OAuthClientsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.OAuthClientsDeleteReq>) => {
    const { id } = ctx.input.body as { id: string };
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const oauthClient = await OAuthClient.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      rejectOnEmpty: true,
    });
    authorize(user, "delete", oauthClient);

    await oauthClient.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
