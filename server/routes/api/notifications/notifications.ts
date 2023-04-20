import Router from "koa-router";
import { WhereOptions, Op } from "sequelize";
import { NotificationEventType } from "@shared/types";
import notificationUpdater from "@server/commands/notificationUpdater";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Notification, User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import { authorize } from "@server/policies";
import { presentPolicies } from "@server/presenters";
import presentNotification from "@server/presenters/notification";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

const handleUnsubscribe = async (
  ctx: APIContext<T.NotificationsUnsubscribeReq>
) => {
  const eventType = (ctx.input.body.eventType ??
    ctx.input.query.eventType) as NotificationEventType;
  const userId = (ctx.input.body.userId ?? ctx.input.query.userId) as string;
  const token = (ctx.input.body.token ?? ctx.input.query.token) as string;

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

router.post(
  "notifications.list",
  auth(),
  pagination(),
  validate(T.NotificationsListSchema),
  transaction(),
  async (ctx: APIContext<T.NotificationsListReq>) => {
    const eventType = ctx.input.body.eventType ?? ctx.input.query.eventType;
    const archived = ctx.input.body.archived ?? ctx.input.query.archived;
    const user = ctx.state.auth.user;
    let where: WhereOptions<Notification> = {
      userId: user.id,
    };
    if (eventType) {
      where = { ...where, event: eventType };
    }
    if (archived) {
      where = {
        ...where,
        archivedAt: {
          [Op.ne]: null,
        },
      };
    }
    const [notifications, unseenCount] = await Promise.all([
      Notification.scope(["withUser", "withActor"]).findAll({
        where,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Notification.count({
        where: {
          ...where,
          viewedAt: {
            [Op.is]: null,
          },
        },
      }),
    ]);

    const data = notifications.map((notification) =>
      presentNotification(notification)
    );

    ctx.body = {
      pagination: ctx.state.pagination,
      data,
      unseenCount,
    };
  }
);

router.post(
  "notifications.update",
  auth(),
  validate(T.NotificationsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.NotificationsUpdateReq>) => {
    const { id, markAsViewed, archive } = ctx.input.body;
    const { user } = ctx.state.auth;

    const notification = await Notification.findByPk(id);
    authorize(user, "update", notification);

    await notificationUpdater({
      notification,
      markAsViewed,
      archive,
      ip: ctx.request.ip,
      transaction: ctx.state.transaction,
    });

    ctx.body = {
      data: presentNotification(notification),
      policies: presentPolicies(user, [notification]),
    };
  }
);

router.post(
  "notifications.update_all",
  auth(),
  validate(T.NotificationsUpdateAllSchema),
  async (ctx: APIContext<T.NotificationsUpdateAllReq>) => {
    const { markAsViewed, archive } = ctx.input.body;
    const { user } = ctx.state.auth;

    const values: { [x: string]: any } = {};
    let where: WhereOptions<Notification> = {
      userId: user.id,
    };
    if (markAsViewed) {
      values.viewedAt = new Date();
      where = {
        ...where,
        viewedAt: {
          [Op.is]: null,
        },
      };
    }
    if (archive) {
      values.archivedAt = new Date();
      where = {
        ...where,
        archivedAt: {
          [Op.is]: null,
        },
      };
    }

    const [updateCount] = await Notification.update(values, { where });

    ctx.body = {
      success: true,
      data: { updateCount },
    };
  }
);

export default router;
