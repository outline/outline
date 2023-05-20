import Router from "koa-router";
import { isNull, isUndefined } from "lodash";
import { WhereOptions, Op } from "sequelize";
import { NotificationEventType } from "@shared/types";
import notificationUpdater from "@server/commands/notificationUpdater";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Notification, User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import { authorize } from "@server/policies";
import { presentPolicies } from "@server/presenters";
import presentNotification from "@server/presenters/notification";
import { APIContext } from "@server/types";
import { safeEqual } from "@server/utils/crypto";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();
const pixel = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

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
    const { eventType, archived } = ctx.input.body;
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
    const [notifications, total, unseen] = await Promise.all([
      Notification.findAll({
        where,
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Notification.count({
        where,
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

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: {
        notifications: await Promise.all(
          notifications.map(presentNotification)
        ),
        unseen,
      },
    };
  }
);

router.get(
  "notifications.pixel",
  transaction(),
  async (ctx: APIContext<T.NotificationsPixelReq>) => {
    const { id, token } = ctx.input.query;
    const notification = await Notification.findByPk(id);

    if (!notification || !safeEqual(token, notification.pixelToken)) {
      throw AuthenticationError();
    }

    await notificationUpdater({
      notification,
      viewedAt: new Date(),
      ip: ctx.request.ip,
      transaction: ctx.state.transaction,
    });

    ctx.response.set("Content-Type", "image/gif");
    ctx.body = pixel;
  }
);

router.post(
  "notifications.update",
  auth(),
  validate(T.NotificationsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.NotificationsUpdateReq>) => {
    const { id, viewedAt, archivedAt } = ctx.input.body;
    const { user } = ctx.state.auth;

    const notification = await Notification.findByPk(id);
    authorize(user, "update", notification);

    await notificationUpdater({
      notification,
      viewedAt,
      archivedAt,
      ip: ctx.request.ip,
      transaction: ctx.state.transaction,
    });

    ctx.body = {
      data: await presentNotification(notification),
      policies: presentPolicies(user, [notification]),
    };
  }
);

router.post(
  "notifications.update_all",
  auth(),
  validate(T.NotificationsUpdateAllSchema),
  async (ctx: APIContext<T.NotificationsUpdateAllReq>) => {
    const { viewedAt, archivedAt } = ctx.input.body;
    const { user } = ctx.state.auth;

    const values: { [x: string]: any } = {};
    let where: WhereOptions<Notification> = {
      userId: user.id,
    };
    if (!isUndefined(viewedAt)) {
      values.viewedAt = viewedAt;
      where = {
        ...where,
        viewedAt: !isNull(viewedAt) ? { [Op.is]: null } : { [Op.ne]: null },
      };
    }
    if (!isUndefined(archivedAt)) {
      values.archivedAt = archivedAt;
      where = {
        ...where,
        archivedAt: !isNull(archivedAt) ? { [Op.is]: null } : { [Op.ne]: null },
      };
    }

    const [total] = await Notification.update(values, { where });

    ctx.body = {
      success: true,
      data: { total },
    };
  }
);

export default router;
