// @flow
import Router from "koa-router";

import auth from "../middlewares/authentication";
import { NotificationSetting } from "../models";
import policy from "../policies";
import { presentNotificationSetting } from "../presenters";

const { authorize } = policy;
const router = new Router();

router.post("notificationSettings.create", auth(), async (ctx) => {
  const { event } = ctx.body;
  ctx.assertPresent(event, "event is required");

  const user = ctx.state.user;
  authorize(user, "create", NotificationSetting);

  const [setting] = await NotificationSetting.findOrCreate({
    where: {
      userId: user.id,
      teamId: user.teamId,
      event,
    },
  });

  ctx.body = {
    data: presentNotificationSetting(setting),
  };
});

router.post("notificationSettings.list", auth(), async (ctx) => {
  const user = ctx.state.user;
  const settings = await NotificationSetting.findAll({
    where: {
      userId: user.id,
    },
  });

  ctx.body = {
    data: settings.map(presentNotificationSetting),
  };
});

router.post("notificationSettings.delete", auth(), async (ctx) => {
  const { id } = ctx.body;
  ctx.assertUuid(id, "id is required");

  const user = ctx.state.user;
  const setting = await NotificationSetting.findByPk(id);
  authorize(user, "delete", setting);

  await setting.destroy();

  ctx.body = {
    success: true,
  };
});

router.post("notificationSettings.unsubscribe", async (ctx) => {
  const { id, token } = ctx.body;
  ctx.assertUuid(id, "id is required");
  ctx.assertPresent(token, "token is required");

  const setting = await NotificationSetting.findByPk(id);
  if (setting) {
    if (token !== setting.unsubscribeToken) {
      ctx.redirect(`${process.env.URL}?notice=invalid-auth`);
    }

    await setting.destroy();
  }

  ctx.redirect(`${process.env.URL}/settings/notifications?success`);
});

export default router;
