import Router from "koa-router";
import env from "@server/env";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

const handleUnsubscribe = async (
  ctx: APIContext<T.NotificationsUnsubscribeReq>
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
  "notifications.unsubscribe",
  validate(T.NotificationsUnsubscribeSchema),
  transaction(),
  handleUnsubscribe
);
router.post(
  "notifications.unsubscribe",
  validate(T.NotificationsUnsubscribeSchema),
  transaction(),
  handleUnsubscribe
);

export default router;
