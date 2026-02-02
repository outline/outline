import Router from "koa-router";
import type { WhereOptions } from "sequelize";
import { Op, Sequelize } from "sequelize";
import type { UserPreference } from "@shared/types";
import {
  TeamPreference,
  UserRole,
  type OIDCProfileSync,
  type UserProfile,
} from "@shared/types";
import { UserRoleHelper } from "@shared/utils/UserRoleHelper";
import { settingsPath } from "@shared/utils/routeHelpers";
import { UserValidation } from "@shared/validations";
import userInviter from "@server/commands/userInviter";
import deactivateInactiveKeycloakUsers from "@server/commands/deactivateInactiveKeycloakUsers";
import ConfirmUpdateEmail from "@server/emails/templates/ConfirmUpdateEmail";
import ConfirmUserDeleteEmail from "@server/emails/templates/ConfirmUserDeleteEmail";
import InviteEmail from "@server/emails/templates/InviteEmail";
import env from "@server/env";
import { AuthorizationError, ValidationError } from "@server/errors";
import logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Event, User, Team } from "@server/models";
import { UserFlag } from "@server/models/User";
import { can, authorize } from "@server/policies";
import {
  presentUser,
  presentPolicies,
  presentUserAuthentication,
} from "@server/presenters";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { safeEqual } from "@server/utils/crypto";
import { getDetailsForEmailUpdateToken } from "@server/utils/jwt";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

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
          team: actor.team,
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
    let user = id ? await User.findByPk(id) : actor;
    authorize(actor, "read", user);
    const includeDetails = !!can(actor, "readDetails", user);
    const includeEmail = !!can(actor, "readEmail", user);

    if (includeDetails) {
      user = await User.scope("withAuthentications").findByPk(user.id, {
        rejectOnEmpty: true,
      });
    }

    ctx.body = {
      data: presentUser(user, {
        includeDetails,
        includeEmail,
        team: actor.team,
      }),
      authentications: includeDetails
        ? user.authentications?.map(presentUserAuthentication)
        : undefined,
      policies: presentPolicies(actor, [user]),
    };
  }
);

router.post(
  "users.updateEmail",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  validate(T.UsersUpdateEmailSchema),
  async (ctx: APIContext<T.UsersUpdateEmailReq>) => {
    if (!env.EMAIL_ENABLED) {
      throw ValidationError("Email support is not setup for this instance");
    }

    const { user: actor } = ctx.state.auth;
    const { id } = ctx.input.body;
    const { team } = actor;
    const user = id ? await User.findByPk(id) : actor;
    const email = ctx.input.body.email.trim().toLowerCase();

    authorize(actor, "update", user);

    // Check if email domain is allowed
    if (!(await team.isDomainAllowed(email))) {
      throw ValidationError("The domain is not allowed for this workspace");
    }

    // Check if email already exists in workspace
    if (await User.findByEmail(ctx, email)) {
      throw ValidationError("User with email already exists");
    }

    await new ConfirmUpdateEmail({
      to: email,
      previous: user.email,
      code: user.getEmailUpdateToken(email),
      teamUrl: team.url,
    }).schedule();

    ctx.body = {
      success: true,
    };
  }
);

router.get(
  "users.updateEmail",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  auth(),
  transaction(),
  validate(T.UsersUpdateEmailConfirmSchema),
  async (ctx: APIContext<T.UsersUpdateEmailConfirmReq>) => {
    if (!env.EMAIL_ENABLED) {
      throw ValidationError("Email support is not setup for this instance");
    }

    const { transaction } = ctx.state;
    const { code, follow } = ctx.input.query;

    // The link in the email does not include the follow query param, this
    // is to help prevent anti-virus, and email clients from pre-fetching the link
    if (!follow) {
      return ctx.redirectOnClient(ctx.request.href + "&follow=true");
    }
    let user: User;
    let email: string;

    try {
      const res = await getDetailsForEmailUpdateToken(code as string, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      user = res.user;
      email = res.email;
    } catch (_err) {
      ctx.redirect(`/?notice=expired-token`);
      return;
    }

    const { user: actor } = ctx.state.auth;
    authorize(actor, "update", user);

    // Check if email domain is allowed
    if (!(await actor.team.isDomainAllowed(email))) {
      throw ValidationError("The domain is not allowed for this workspace");
    }

    // Check if email already exists in workspace
    if (await User.findByEmail(ctx, email)) {
      throw ValidationError("User with email already exists");
    }

    const previousEmail = user.email;
    await user.updateWithCtx(ctx, { email });
    if (previousEmail !== email) {
      await Event.createFromContext(ctx, {
        name: "users.update",
        userId: user.id,
        data: {
          changes: {
            email: { from: previousEmail, to: email },
          },
        },
      });
    }

    ctx.redirect(settingsPath());
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
    const {
      id,
      name,
      avatarUrl,
      language,
      preferences,
      timezone,
      password,
    } = ctx.input.body;
    let profile = ctx.input.body.profile;

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

    const previousName = user.name;
    const previousAvatarUrl = user.avatarUrl;
    const previousProfile = user.profile ?? null;
    const changes: Record<
      string,
      { from: string | null | undefined; to: string | null | undefined }
    > = {};

    if (name) {
      const canChangeName = actor.isAdmin
        ? true
        : actor.id !== user.id
          ? true
          : !!actor.team.getPreference(TeamPreference.MembersCanChangeName);
      if (!canChangeName) {
        throw AuthorizationError("Changing your name is disabled.");
      }
      if (previousName !== name) {
        changes.name = { from: previousName, to: name };
      }
      user.name = name;
    }
    if (avatarUrl !== undefined) {
      if (previousAvatarUrl !== avatarUrl) {
        changes.avatarUrl = { from: previousAvatarUrl, to: avatarUrl };
      }
      user.avatarUrl = avatarUrl;

      // Mark that the user has manually changed their avatar
      // This prevents automatic syncing from identity providers
      user.setFlag(UserFlag.AvatarUpdated, avatarUrl ? true : false);
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
    if (password) {
      if (!actor.isAdmin) {
        throw AuthorizationError("Updating password requires admin.");
      }
      const authentications = await user.$get("authentications", {
        transaction,
      });
      if (authentications.length > 0) {
        throw AuthorizationError("Password login is disabled for SSO users.");
      }
      if (!user.invitedById) {
        throw AuthorizationError("Password login is disabled for this user.");
      }
      await user.setPassword(password);
      changes.password = { from: null, to: "updated" };
    }
    if (profile) {
      if (!actor.isAdmin) {
        if (actor.id !== user.id) {
          throw AuthorizationError("Updating profile fields requires admin.");
        }

        const oidcProfileSync = actor.team.getPreference(
          TeamPreference.OIDCProfileSync
        ) as OIDCProfileSync | undefined;
        const sanitizedProfile = sanitizeSelfProfileUpdate(
          profile,
          oidcProfileSync
        );

        if (!sanitizedProfile) {
          throw AuthorizationError(
            "Updating profile fields requires admin."
          );
        }

        profile = sanitizedProfile;
      }

      const nextProfile: UserProfile = {
        ...(user.profile ?? {}),
        ...profile,
      };
      const previousProfileString = JSON.stringify(previousProfile ?? {});
      const nextProfileString = JSON.stringify(nextProfile);
      if (previousProfileString !== nextProfileString) {
        changes.profile = { from: previousProfileString, to: nextProfileString };
      }
      user.profile = nextProfile;
    }

    await user.saveWithCtx(ctx);

    if (Object.keys(changes).length > 0) {
      await Event.createFromContext(ctx, {
        name: "users.update",
        userId: user.id,
        data: {
          changes,
        },
      });
    }

    ctx.body = {
      data: presentUser(user, {
        includeDetails,
        team: actor.team,
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
    name = "demote";
    authorize(actor, "demote", user);
  }
  if (UserRoleHelper.canPromote(user, role)) {
    name = "promote";
    authorize(actor, "promote", user);
  }

  await user.updateWithCtx(ctx, { role }, { name });
  const includeDetails = !!can(actor, "readDetails", user);

  ctx.body = {
    data: presentUser(user, {
      includeDetails,
      team: actor.team,
    }),
    policies: presentPolicies(actor, [user]),
  };
}

const SELF_EDITABLE_PROFILE_KEYS: Array<keyof UserProfile> = [
  "title",
  "department",
  "phone",
  "internalPhone",
  "mobilePhone",
];

function sanitizeSelfProfileUpdate(
  profile: UserProfile,
  oidcProfileSync?: OIDCProfileSync
): UserProfile | undefined {
  const lockedKeys = new Set<keyof UserProfile>();
  if (oidcProfileSync) {
    if (oidcProfileSync.title) {
      lockedKeys.add("title");
    }
    if (oidcProfileSync.department) {
      lockedKeys.add("department");
    }
  }

  const sanitized: UserProfile = {};
  let hasUpdates = false;

  for (const key of SELF_EDITABLE_PROFILE_KEYS) {
    if (lockedKeys.has(key)) {
      continue;
    }
    if (profile[key] !== undefined) {
      sanitized[key] = profile[key];
      hasUpdates = true;
    }
  }

  return hasUpdates ? sanitized : undefined;
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

    await user.updateWithCtx(
      ctx,
      {
        suspendedById: actor.id,
        suspendedAt: new Date(),
      },
      {
        name: "suspend",
      }
    );
    const includeDetails = !!can(actor, "readDetails", user);

    ctx.body = {
      data: presentUser(user, {
        includeDetails,
        team: actor.team,
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

    await user.updateWithCtx(
      ctx,
      {
        suspendedById: null,
        suspendedAt: null,
      },
      {
        name: "activate",
      }
    );
    const includeDetails = !!can(actor, "readDetails", user);

    ctx.body = {
      data: presentUser(user, {
        includeDetails,
        team: actor.team,
      }),
      policies: presentPolicies(actor, [user]),
    };
  }
);

router.post(
  "users.invite",
  rateLimiter(RateLimiterStrategy.FiftyPerHour),
  auth(),
  validate(T.UsersInviteSchema),
  transaction(),
  async (ctx: APIContext<T.UsersInviteReq>) => {
    const { invites } = ctx.input.body;
    const { user } = ctx.state.auth;

    if (invites.length > UserValidation.maxInvitesPerRequest) {
      throw ValidationError(
        `You can only invite up to ${UserValidation.maxInvitesPerRequest} users at a time`
      );
    }
    authorize(user, "inviteUser", user.team);

    const response = await userInviter(ctx, { invites });

    ctx.body = {
      data: {
        sent: response.sent,
        unsent: response.unsent,
        users: response.users.map((u) =>
          presentUser(u, {
            includeEmail: !!can(user, "readEmail", u),
            team: user.team,
          })
        ),
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
      const baseUrl = ctx.request.origin || env.URL;
      logger.info(
        "email",
        `Sign in immediately: ${baseUrl}/auth/email.callback?token=${user.getEmailSigninToken(
          ctx
        )}`
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
    if (!env.EMAIL_ENABLED) {
      throw ValidationError("Email support is not setup for this instance");
    }

    const { user } = ctx.state.auth;
    authorize(user, "delete", user);

    await new ConfirmUserDeleteEmail({
      to: user.email,
      deleteConfirmationCode: user.deleteConfirmationCode,
      teamName: user.team.name,
      teamUrl: user.team.url,
    }).schedule();

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
    if ((!id || id === actor.id) && env.EMAIL_ENABLED) {
      const deleteConfirmationCode = user.deleteConfirmationCode;

      if (!safeEqual(code, deleteConfirmationCode)) {
        throw ValidationError("The confirmation code was incorrect");
      }
    }

    await user.destroyWithCtx(ctx);

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
    const { user } = ctx.state.auth;
    user.setNotificationEventType(eventType, true);

    await user.saveWithCtx(ctx);

    ctx.body = {
      data: presentUser(user, { includeDetails: true, team: user.team }),
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
    const { user } = ctx.state.auth;
    user.setNotificationEventType(eventType, false);

    await user.saveWithCtx(ctx);

    ctx.body = {
      data: presentUser(user, { includeDetails: true, team: user.team }),
    };
  }
);

router.post(
  "users.deactivateInactiveKeycloak",
  auth({ role: UserRole.Admin }),
  validate(T.UsersDeactivateInactiveKeycloakSchema),
  transaction(),
  async (ctx: APIContext<T.UsersDeactivateInactiveKeycloakReq>) => {
    const { inactiveDays } = ctx.input.body;
    const actor = ctx.state.auth.user;

    authorize(actor, "update", actor.team);

    const result = await deactivateInactiveKeycloakUsers(ctx, inactiveDays);

    ctx.body = {
      success: true,
      data: result,
    };
  }
);

export default router;
