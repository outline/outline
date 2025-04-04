import Router from "koa-router";
import auth from "@server/middlewares/authentication";
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
import * as T from "./schema";

const router = new Router();

router.post(
  "oauthClients.create",
  auth(),
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
  "oauthClients.info",
  auth(),
  validate(T.OAuthClientsInfoSchema),
  async (ctx: APIContext<T.OAuthClientsInfoReq>) => {
    const { id, clientId } = ctx.input.body;
    const { user } = ctx.state.auth;

    const oauthClient = await OAuthClient.findOne({
      where: clientId ? { clientId } : { id },
      rejectOnEmpty: true,
    });
    authorize(user, "read", oauthClient);

    const internal = oauthClient.teamId === user.teamId;

    ctx.body = {
      data: internal
        ? presentOAuthClient(oauthClient)
        : presentPublishedOAuthClient(oauthClient),
      policies: internal ? presentPolicies(user, [oauthClient]) : [],
    };
  }
);

export default router;
