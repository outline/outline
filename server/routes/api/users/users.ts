import Router from "koa-router";
import { Op, Sequelize, WhereOptions } from "sequelize";
import { UserPreference, UserRole } from "@shared/types";
import { UserRoleHelper } from "@shared/utils/UserRoleHelper";
import { UserValidation } from "@shared/validations";
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
import { UserFlag } from "@server/models/User";
import { can, authorize } from "@server/policies";
import { presentUser, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { safeEqual } from "@server/utils/crypto";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();
const emailEnabled = !!(env.SMTP_HOST || env.isDevelopment);

router.post(
  "users.list",
  auth(),
  pagination(),
  validate(T.UsersListSchema),
  async (ctx: APIContext<T.UsersListReq>) => {
    const { sort, direction, query, role, filter, ids, emails } =
      ctx.input.body;

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
        where = { ...where, role: UserRole.Viewer };
        break;
      }

      case "admins": {
        where = { ...where, role: UserRole.Admin };
        break;
      }

      case "members": {
        where = { ...where, role: UserRole.Member };
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

    if (role) {
      where = {
        ...where,
        role,
      };
    }

    if (query) {
      where = {
        ...where,
        [Op.and]: {
          [Op.or]: [
            Sequelize.literal(
              `unaccent(LOWER(email)) like unaccent(LOWER(:query))`
            ),
            Sequelize.literal(
              `unaccent(LOWER(name)) like unaccent(LOWER(:query))`
            ),
          ],
        },
      };
    }

    if (ids) {
      where = {
        ...where,
        id: ids,
      };
    }

    if (emails) {
      where = {
        ...where,
        email: emails,
      };
    }

    const replacements = { query: `%${query}%` };

    const [users, total] = await Promise.all([
      User.findAll({
        where,
        replacements,
        order: [[sort, direction]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      User.count({
        where,
        // @ts-expect-error Types are incorrect for count
        replacements,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: users.map((user) =>
        presentUser(user, {
          includeEmail: !!can(actor, "readEmail", user),
          includeDetails: !!can(actor, "readDetails", user),
        })
      ),
      policies: presentPolicies(actor, users),
    };
  }
);

router.post(
  "users.info",
  auth(),
  validate(T.UsersInfoSchema),
  async (ctx: APIContext<T.UsersInfoReq>) => {
    const { id } = ctx.input.body;
    const actor = ctx.state.auth.user;
    const user = id ? await User.findByPk(id) : actor;
    authorize(actor, "read", user);
    const includeDetails = !!can(actor, "readDetails", user);

    ctx.body = {
      data: presentUser(user, {
        includeDetails,
      }),
      policies: presentPolicies(actor, [user]),
    };
  }
);

router.post(
  "users.update",
  auth(),
  validate(T.UsersUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.UsersUpdateReq>) => {
    const { auth, transaction } = ctx.state;
    const actor = auth.user;
    const { id, name, avatarUrl, language, preferences, timezone } =
      ctx.input.body;

    let user: User | null = actor;
    if (id) {
      user = await User.findByPk(id, {
        rejectOnEmpty: true,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    }
    authorize(actor, "update", user);
    const includeDetails = !!can(actor, "readDetails", user);

    if (name) {
      user.name = name;
    }
    if (avatarUrl !== undefined) {
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
    if (timezone) {
      user.timezone = timezone;
    }

    await Event.createFromContext(ctx, {
      name: "users.update",
      userId: user.id,
      changes: user.changeset,
    });
    await user.save({ transaction });

    ctx.body = {
      data: presentUser(user, {
        includeDetails,
      }),
    };
  }
);

// Admin specific

/**
 * Promote a user to an admin.
 *
 * @deprecated Use `users.update_role` instead.
 */
router.post(
  "users.promote",
  auth({ role: UserRole.Admin }),
  validate(T.UsersPromoteSchema),
  transaction(),
  (ctx: APIContext<T.UsersPromoteReq>) => {
    const forward = ctx as unknown as APIContext<T.UsersChangeRoleReq>;
    forward.input = {
      body: {
        id: ctx.input.body.id,
        role: UserRole.Admin,
      },
    };

    return updateRole(forward);
  }
);

/**
 * Demote a user to another role.
 *
 * @deprecated Use `users.update_role` instead.
 */
router.post(
  "users.demote",
  auth({ role: UserRole.Admin }),
  validate(T.UsersDemoteSchema),
  transaction(),
  (ctx: APIContext<T.UsersDemoteReq>) => {
    const forward = ctx as unknown as APIContext<T.UsersChangeRoleReq>;
    forward.input = {
      body: {
        id: ctx.input.body.id,
        role: ctx.input.body.to,
      },
    };

    return updateRole(forward);
  }
);

router.post(
  "users.update_role",
  auth({ role: UserRole.Admin }),
  validate(T.UsersChangeRoleSchema),
  transaction(),
  updateRole
);

async function updateRole(ctx: APIContext<T.UsersChangeRoleReq>) {
  const { transaction } = ctx.state;
  const userId = ctx.input.body.id;
  const role = ctx.input.body.role;
  const actor = ctx.state.auth.user;

  const user = await User.findByPk(userId, {
    rejectOnEmpty: true,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  await Team.findByPk(user.teamId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  let name;

  if (user.role === role) {
    throw ValidationError("User is already in that role");
  }
  if (user.id === actor.id) {
    throw ValidationError("You cannot change your own role");
  }

  if (UserRoleHelper.canDemote(user, role)) {
    name = "users.demote";
    authorize(actor, "demote", user);
  }
  if (UserRoleHelper.canPromote(user, role)) {
    name = "users.promote";
    authorize(actor, "promote", user);
  }

  await user.update({ role }, { transaction });

  await Event.createFromContext(ctx, {
    name,
    userId,
    data: {
      name: user.name,
      role,
    },
  });

  const includeDetails = !!can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
    }),
    policies: presentPolicies(actor, [user]),
  };
}

router.post(
  "users.suspend",
  auth(),
  validate(T.UsersSuspendSchema),
  transaction(),
  async (ctx: APIContext<T.UsersSuspendReq>) => {
    const { transaction } = ctx.state;
    const userId = ctx.input.body.id;
    const actor = ctx.state.auth.user;
    const user = await User.findByPk(userId, {
      rejectOnEmpty: true,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(actor, "suspend", user);

    await userSuspender({
      user,
      actorId: actor.id,
      ip: ctx.request.ip,
      transaction,
    });
    const includeDetails = !!can(actor, "readDetails", user);

    ctx.body = {
      data: presentUser(user, {
        includeDetails,
      }),
      policies: presentPolicies(actor, [user]),
    };
  }
);

router.post(
  "users.activate",
  auth(),
  validate(T.UsersActivateSchema),
  transaction(),
  async (ctx: APIContext<T.UsersActivateReq>) => {
    const { transaction } = ctx.state;
    const userId = ctx.input.body.id;
    const actor = ctx.state.auth.user;
    const user = await User.findByPk(userId, {
      rejectOnEmpty: true,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(actor, "activate", user);

    await userUnsuspender({
      user,
      actorId: actor.id,
      transaction,
      ip: ctx.request.ip,
    });
    const includeDetails = !!can(actor, "readDetails", user);

    ctx.body = {
      data: presentUser(user, {
        includeDetails,
      }),
      policies: presentPolicies(actor, [user]),
    };
  }
);

router.post(
  "users.invite",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  validate(T.UsersInviteSchema),
  async (ctx: APIContext<T.UsersInviteReq>) => {
    const { invites } = ctx.input.body;

    if (invites.length > UserValidation.maxInvitesPerRequest) {
      throw ValidationError(
        `You can only invite up to ${UserValidation.maxInvitesPerRequest} users at a time`
      );
    }

    const { user } = ctx.state.auth;
    const team = await Team.findByPk(user.teamId);
    authorize(user, "inviteUser", team);

    const response = await userInviter({
      user,
      invites,
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
  validate(T.UsersResendInviteSchema),
  transaction(),
  async (ctx: APIContext<T.UsersResendInviteReq>) => {
    const { id } = ctx.input.body;
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

    if (env.isDevelopment) {
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
  validate(T.UsersDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.UsersDeleteSchemaReq>) => {
    const { transaction } = ctx.state;
    const { id, code } = ctx.input.body;
    const actor = ctx.state.auth.user;
    let user: User;

    if (id) {
      user = await User.findByPk(id, {
        rejectOnEmpty: true,
        transaction,
        lock: transaction.LOCK.UPDATE,
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

    await userDestroyer(ctx, {
      user,
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

    await Event.createFromContext(ctx, {
      name: "users.update",
      userId: user.id,
      changes: user.changeset,
    });
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

    await Event.createFromContext(ctx, {
      name: "users.update",
      userId: user.id,
      changes: user.changeset,
    });
    await user.save({ transaction });

    ctx.body = {
      data: presentUser(user, { includeDetails: true }),
    };
  }
);

export default router;
