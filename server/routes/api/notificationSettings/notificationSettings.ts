import Router from "koa-router";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import { presentUser } from "@server/presenters";
import { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

router.post(
  "notificationSettings.create",
  auth(),
  validate(T.NotificationSettingsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.NotificationSettingsCreateReq>) => {
    const { eventType } = ctx.input.body;
    const { transaction } = ctx.state;

    const { user } = ctx.state.auth;
    user.setNotificationEventType(eventType, true);
    await user.save({ transaction });

    ctx.body = {
      data: presentUser(user),
    };
  }
);

router.post(
  "notificationSettings.delete",
  auth(),
  validate(T.NotificationSettingsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.NotificationSettingsDeleteReq>) => {
    const { eventType } = ctx.input.body;
    const { transaction } = ctx.state;

    const { user } = ctx.state.auth;
    user.setNotificationEventType(eventType, false);
    await user.save({ transaction });

    ctx.body = {
      data: presentUser(user),
    };
  }
);

const handleUnsubscribe = async (
  ctx: APIContext<T.NotificationSettingsUnsubscribeReq>
) => {
  const { eventType, userId, token } =
    ctx.method === "POST" ? ctx.input.body : ctx.input.query;

  const user = await User.scope("withTeam").findByPk(userId, {
    rejectOnEmpty: true,
  });
  const unsubscribeToken = NotificationSettingsHelper.unsubscribeToken(
    user,
    eventType
  );

  if (unsubscribeToken !== token) {
    ctx.redirect(`${env.URL}?notice=invalid-auth`);
    return;
  }

  user.setNotificationEventType(eventType, false);
  await user.save();
  ctx.redirect(`${user.team.url}/settings/notifications?success`);
};

router.get(
  "notificationSettings.unsubscribe",
  validate(T.NotificationSettingsUnsubscribeSchema),
  transaction(),
  handleUnsubscribe
);
router.post(
  "notificationSettings.unsubscribe",
  validate(T.NotificationSettingsUnsubscribeSchema),
  transaction(),
  handleUnsubscribe
);

export default router;
