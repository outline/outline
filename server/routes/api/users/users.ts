import Router from "koa-router";
import { Op, WhereOptions } from "sequelize";
import { UserPreference } from "@shared/types";
import { UserValidation } from "@shared/validations";
import userDemoter from "@server/commands/userDemoter";
import userDestroyer from "@server/commands/userDestroyer";
import userInviter from "@server/commands/userInviter";
import userSuspender from "@server/commands/userSuspender";
import userUnsuspender from "@server/commands/userUnsuspender";
import ConfirmUserDeleteEmail from "@server/emails/templates/ConfirmUserDeleteEmail";
import InviteEmail from "@server/emails/templates/InviteEmail";
import env from "@server/env";
import { ValidationError } from "@server/errors";
import logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Event, User, Team } from "@server/models";
import { UserFlag, UserRole } from "@server/models/User";
import { can, authorize } from "@server/policies";
import { presentUser, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { safeEqual } from "@server/utils/crypto";
import {
  assertIn,
  assertSort,
  assertPresent,
  assertArray,
  assertUuid,
} from "@server/validation";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();
const emailEnabled = !!(env.SMTP_HOST || env.ENVIRONMENT === "development");

router.post("users.list", auth(), pagination(), async (ctx: APIContext) => {
  let { direction } = ctx.request.body;
  const { sort = "createdAt", query, filter, ids } = ctx.request.body;
  if (direction !== "ASC") {
    direction = "DESC";
  }
  assertSort(sort, User);

  if (filter) {
    assertIn(
      filter,
      ["invited", "viewers", "admins", "members", "active", "all", "suspended"],
      "Invalid filter"
    );
  }

  const actor = ctx.state.auth.user;
  let where: WhereOptions<User> = {
    teamId: actor.teamId,
  };

  // Filter out suspended users if we're not an admin
  if (!actor.isAdmin) {
    where = {
      ...where,
      suspendedAt: {
        [Op.eq]: null,
      },
    };
  }

  switch (filter) {
    case "invited": {
      where = { ...where, lastActiveAt: null };
      break;
    }

    case "viewers": {
      where = { ...where, isViewer: true };
      break;
    }

    case "admins": {
      where = { ...where, isAdmin: true };
      break;
    }

    case "members": {
      where = { ...where, isAdmin: false, isViewer: false };
      break;
    }

    case "suspended": {
      if (actor.isAdmin) {
        where = {
          ...where,
          suspendedAt: {
            [Op.ne]: null,
          },
        };
      }
      break;
    }

    case "active": {
      where = {
        ...where,
        lastActiveAt: {
          [Op.ne]: null,
        },
        suspendedAt: {
          [Op.is]: null,
        },
      };
      break;
    }

    case "all": {
      break;
    }

    default: {
      where = {
        ...where,
        suspendedAt: {
          [Op.is]: null,
        },
      };
      break;
    }
  }

  if (query) {
    where = {
      ...where,
      name: {
        [Op.iLike]: `%${query}%`,
      },
    };
  }

  if (ids) {
    assertArray(ids, "ids must be an array of UUIDs");
    where = {
      ...where,
      id: ids,
    };
  }

  const [users, total] = await Promise.all([
    User.findAll({
      where,
      order: [[sort, direction]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    }),
    User.count({
      where,
    }),
  ]);

  ctx.body = {
    pagination: { ...ctx.state.pagination, total },
    data: users.map((user) =>
      presentUser(user, {
        includeDetails: can(actor, "readDetails", user),
      })
    ),
    policies: presentPolicies(actor, users),
  };
});

router.post("users.count", auth(), async (ctx: APIContext) => {
  const { user } = ctx.state.auth;
  const counts = await User.getCounts(user.teamId);

  ctx.body = {
    data: {
      counts,
    },
  };
});

router.post("users.info", auth(), async (ctx: APIContext) => {
  const { id } = ctx.request.body;
  const actor = ctx.state.auth.user;
  const user = id ? await User.findByPk(id) : actor;
  authorize(actor, "read", user);
  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post(
  "users.update",
  auth(),
  transaction(),
  validate(T.UsersUpdateSchema),
  async (ctx: APIContext<T.UsersUpdateReq>) => {
    const { auth, transaction } = ctx.state;
    const actor = auth.user;
    const { id, name, avatarUrl, language, preferences } = ctx.input.body;

    let user: User | null = actor;
    if (id) {
      user = await User.findByPk(id);
    }
    authorize(actor, "update", user);
    const includeDetails = can(actor, "readDetails", user);

    if (name) {
      user.name = name;
    }
    if (avatarUrl) {
      user.avatarUrl = avatarUrl;
    }
    if (language) {
      user.language = language;
    }
    if (preferences) {
      for (const key of Object.keys(preferences) as Array<UserPreference>) {
        user.setPreference(key, preferences[key] as boolean);
      }
    }
    await user.save({ transaction });
    await Event.create(
      {
        name: "users.update",
        actorId: user.id,
        userId: user.id,
        teamId: user.teamId,
        ip: ctx.request.ip,
      },
      { transaction }
    );

    ctx.body = {
      data: presentUser(user, {
        includeDetails,
      }),
    };
  }
);

// Admin specific
router.post("users.promote", auth(), async (ctx: APIContext) => {
  const userId = ctx.request.body.id;
  const actor = ctx.state.auth.user;
  const teamId = actor.teamId;
  assertPresent(userId, "id is required");
  const user = await User.findByPk(userId);
  authorize(actor, "promote", user);

  await user.promote();
  await Event.create({
    name: "users.promote",
    actorId: actor.id,
    userId,
    teamId,
    data: {
      name: user.name,
    },
    ip: ctx.request.ip,
  });
  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.demote", auth(), async (ctx: APIContext) => {
  const userId = ctx.request.body.id;
  let { to } = ctx.request.body;
  const actor = ctx.state.auth.user;
  assertPresent(userId, "id is required");

  to = (to === "viewer" ? "viewer" : "member") as UserRole;

  const user = await User.findByPk(userId, {
    rejectOnEmpty: true,
  });
  authorize(actor, "demote", user);

  await userDemoter({
    to,
    user,
    actorId: actor.id,
    ip: ctx.request.ip,
  });
  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.suspend", auth(), async (ctx: APIContext) => {
  const userId = ctx.request.body.id;
  const actor = ctx.state.auth.user;
  assertPresent(userId, "id is required");
  const user = await User.findByPk(userId, {
    rejectOnEmpty: true,
  });
  authorize(actor, "suspend", user);

  await userSuspender({
    user,
    actorId: actor.id,
    ip: ctx.request.ip,
  });
  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post("users.activate", auth(), async (ctx: APIContext) => {
  const userId = ctx.request.body.id;
  const actor = ctx.state.auth.user;
  assertPresent(userId, "id is required");
  const user = await User.findByPk(userId, {
    rejectOnEmpty: true,
  });
  authorize(actor, "activate", user);

  await userUnsuspender({
    user,
    actorId: actor.id,
    ip: ctx.request.ip,
  });
  const includeDetails = can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
});

router.post(
  "users.invite",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  async (ctx: APIContext) => {
    const { invites } = ctx.request.body;
    assertArray(invites, "invites must be an array");
    const { user } = ctx.state.auth;
    const team = await Team.findByPk(user.teamId);
    authorize(user, "inviteUser", team);

    const response = await userInviter({
      user,
      invites: invites.slice(0, UserValidation.maxInvitesPerRequest),
      ip: ctx.request.ip,
    });

    ctx.body = {
      data: {
        sent: response.sent,
        users: response.users.map((user) => presentUser(user)),
      },
    };
  }
);

router.post(
  "users.resendInvite",
  auth(),
  transaction(),
  async (ctx: APIContext) => {
    const { id } = ctx.request.body;
    const { auth, transaction } = ctx.state;
    const actor = auth.user;

    const user = await User.findByPk(id, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    authorize(actor, "resendInvite", user);

    if (user.getFlag(UserFlag.InviteSent) > 2) {
      throw ValidationError("This invite has been sent too many times");
    }

    await new InviteEmail({
      to: user.email,
      name: user.name,
      actorName: actor.name,
      actorEmail: actor.email,
      teamName: actor.team.name,
      teamUrl: actor.team.url,
    }).schedule();

    user.incrementFlag(UserFlag.InviteSent);
    await user.save({ transaction });

    if (env.ENVIRONMENT === "development") {
      logger.info(
        "email",
        `Sign in immediately: ${
          env.URL
        }/auth/email.callback?token=${user.getEmailSigninToken()}`
      );
    }

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "users.requestDelete",
  rateLimiter(RateLimiterStrategy.FivePerHour),
  auth(),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    authorize(user, "delete", user);

    if (emailEnabled) {
      await new ConfirmUserDeleteEmail({
        to: user.email,
        deleteConfirmationCode: user.deleteConfirmationCode,
      }).schedule();
    }

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "users.delete",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  async (ctx: APIContext) => {
    const { id, code = "" } = ctx.request.body;
    const actor = ctx.state.auth.user;
    let user: User;

    if (id) {
      assertUuid(id, "id must be a UUID");
      user = await User.findByPk(id, {
        rejectOnEmpty: true,
      });
    } else {
      user = actor;
    }
    authorize(actor, "delete", user);

    // If we're attempting to delete our own account then a confirmation code
    // is required. This acts as CSRF protection.
    if ((!id || id === actor.id) && emailEnabled) {
      const deleteConfirmationCode = user.deleteConfirmationCode;

      if (!safeEqual(code, deleteConfirmationCode)) {
        throw ValidationError("The confirmation code was incorrect");
      }
    }

    await userDestroyer({
      user,
      actor,
      ip: ctx.request.ip,
    });

    ctx.body = {
      success: true,
    };
  }
);

router.post(
  "users.notificationsSubscribe",
  auth(),
  validate(T.UsersNotificationsSubscribeSchema),
  transaction(),
  async (ctx: APIContext<T.UsersNotificationsSubscribeReq>) => {
    const { eventType } = ctx.input.body;
    const { transaction } = ctx.state;

    const { user } = ctx.state.auth;
    user.setNotificationEventType(eventType, true);
    await user.save({ transaction });

    ctx.body = {
      data: presentUser(user, { includeDetails: true }),
    };
  }
);

router.post(
  "users.notificationsUnsubscribe",
  auth(),
  validate(T.UsersNotificationsUnsubscribeSchema),
  transaction(),
  async (ctx: APIContext<T.UsersNotificationsUnsubscribeReq>) => {
    const { eventType } = ctx.input.body;
    const { transaction } = ctx.state;

    const { user } = ctx.state.auth;
    user.setNotificationEventType(eventType, false);
    await user.save({ transaction });

    ctx.body = {
      data: presentUser(user, { includeDetails: true }),
    };
  }
);

export default router;
