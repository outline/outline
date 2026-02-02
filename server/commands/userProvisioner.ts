import type { InferCreationAttributes } from "sequelize";
import { Op } from "sequelize";
import type { UserProfile, UserRole } from "@shared/types";
import { TeamPreference } from "@shared/types";
import InviteAcceptedEmail from "@server/emails/templates/InviteAcceptedEmail";
import {
  DomainNotAllowedError,
  InternalError,
  InvalidAuthenticationError,
  InviteRequiredError,
} from "@server/errors";
import Logger from "@server/logging/Logger";
import { Team, User, UserAuthentication, AuthenticationProvider } from "@server/models";
import { sequelize } from "@server/storage/database";
import type { APIContext } from "@server/types";
import { UserFlag } from "@server/models/User";
import UploadUserAvatarTask from "@server/queues/tasks/UploadUserAvatarTask";
import domainGroupProvisioner from "./domainGroupProvisioner";
import departmentGroupProvisioner from "./departmentGroupProvisioner";
import { createContext } from "@server/context";
import { GroupUser, Collection, UserMembership, Group } from "@server/models";
import { GroupPermission, CollectionPermission } from "@shared/types";

type UserProvisionerResult = {
  user: User;
  isNewUser: boolean;
  authentication: UserAuthentication | null;
};

function getOidcProfileSync(team: Team | null) {
  const preference = team?.getPreference(TeamPreference.OIDCProfileSync);
  return preference && typeof preference === "object" ? preference : {};
}

function getProfileValue(
  profile: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (!profile) {
    return undefined;
  }
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function buildProfileUpdate(
  profile: Record<string, unknown> | undefined,
  sync: ReturnType<typeof getOidcProfileSync>,
  currentProfile: UserProfile | null
): UserProfile | null {
  if (!profile) {
    return currentProfile ?? null;
  }

  const updates: UserProfile = { ...(currentProfile ?? {}) };
  if (sync.title) {
    const title = getProfileValue(profile, ["title", "jobTitle"]);
    if (title !== undefined) {
      updates.title = title;
    }
  }
  if (sync.department) {
    const department = getProfileValue(profile, ["department"]);
    if (department !== undefined) {
      updates.department = department;
    }
  }

  return updates;
}

type Props = {
  /** The displayed name of the user */
  name: string;
  /** The email address of the user */
  email: string;
  /** The language of the user, if known */
  language?: string;
  /** The role for new user, Member if none is provided */
  role?: UserRole;
  /** The public url of an image representing the user */
  avatarUrl?: string | null;
  /**
   * The internal ID of the team that is being logged into based on the
   * subdomain that the request came from, if any.
   */
  teamId: string;
  /** Department name from OIDC provider (e.g., Keycloak) for automatic group creation */
  department?: string;
  /** Bundle of props related to the current external provider authentication */
  authentication?: {
    authenticationProviderId: string;
    /** External identifier of the user in the authentication provider  */
    providerId: string | number;
    /** The scopes granted by the access token */
    scopes: string[];
    /** The token provided by the authentication provider */
    accessToken?: string;
    /** The refresh token provided by the authentication provider */
    refreshToken?: string;
    /** The timestamp when the access token expires */
    expiresAt?: Date;
    /** Raw profile returned by the authentication provider */
    profile?: Record<string, unknown>;
  };
};

export default async function userProvisioner(
  ctx: APIContext,
  { name, email, role, language, avatarUrl, teamId, department, authentication }: Props
): Promise<UserProvisionerResult> {
  const auth = authentication
    ? await UserAuthentication.findOne({
      where: {
        providerId: String(authentication.providerId),
      },
      include: [
        {
          model: User,
          as: "user",
          where: { teamId },
          required: true,
        },
        {
          model: AuthenticationProvider,
          as: "authenticationProvider",
          required: true,
        },
      ],
    })
    : undefined;

  // Someone has signed in with this authentication before, we just
  // want to update the details instead of creating a new record
  if (auth && authentication) {
    const { providerId, authenticationProviderId, ...rest } = authentication;
    const { user } = auth;
    const team = await Team.findByPk(user.teamId);
    const oidcProfileSync = getOidcProfileSync(team);

    // We found an authentication record that matches the user id, but it's
    // associated with a different authentication provider, (eg a different
    // hosted google domain). This is possible in Google Auth when moving domains.
    // In the future we may auto-migrate these.
    if (auth.authenticationProviderId !== authenticationProviderId) {
      throw InternalError(
        `User authentication ${providerId} already exists for ${auth.authenticationProviderId}, tried to assign to ${authenticationProviderId}`
      );
    }

    if (user) {
      if (avatarUrl && !user.getFlag(UserFlag.AvatarUpdated)) {
        await new UploadUserAvatarTask().schedule({
          userId: user.id,
          avatarUrl,
        });
      }
      if (auth.authenticationProvider.name === "oidc") {
        const profile = buildProfileUpdate(
          authentication.profile,
          oidcProfileSync,
          user.profile
        );
        await user.update({
          ...(oidcProfileSync.email ? { email } : {}),
          ...(oidcProfileSync.name ? { name } : {}),
          ...(profile ? { profile } : {}),
        });
      } else {
        await user.update({ email });
      }
      await auth.update(rest);

      return {
        user,
        authentication: auth,
        isNewUser: false,
      };
    }

    // We found an authentication record, but the associated user was deleted or
    // otherwise didn't exist. Cleanup the auth record and proceed with creating
    // a new user. See: https://github.com/outline/outline/issues/2022
    await auth.destroy();
  }

  // For OIDC/Keycloak: Check if authentication provider is OIDC for email-based mapping
  const isOIDCAuth = authentication
    ? await AuthenticationProvider.findByPk(authentication.authenticationProviderId, {
      attributes: ["name"],
    }).then((provider) => provider?.name === "oidc")
    : false;

  // A `user` record may exist even if there is no existing authentication record.
  // For OIDC/Keycloak: prioritize email matching for user mapping
  // This is either an invite or a user that's external to the team
  const existingUser = await User.scope([
    "withAuthentications",
    "withTeam",
  ]).findOne({
    where: {
      // Email from auth providers may be capitalized
      email: {
        [Op.iLike]: email,
      },
      teamId,
    },
  });

  if (isOIDCAuth && existingUser) {
    Logger.debug(
      "authentication",
      "Found existing user by email for OIDC mapping",
      {
        userId: existingUser.id,
        email,
        teamId,
      }
    );
  }

  const team = await Team.scope("withDomains").findByPk(teamId, {
    attributes: ["defaultUserRole", "inviteRequired", "id"],
  });
  const oidcProfileSync = getOidcProfileSync(team);

  // We have an existing user, so we need to update it with our
  // new details and count this as a new user creation.
  if (existingUser) {
    // A `user` record might exist in the form of an invite.
    // An invite is a shell user record with no authentication method
    // that's never been active before.
    const isInvite = existingUser.isInvited;

    const userAuth = await sequelize.transaction(async (transaction) => {
      // Regardless, create a new authentication record
      // against the existing user (user can auth with multiple SSO providers)
      // Update user's name and avatar based on the most recently added provider
      const profile = buildProfileUpdate(
        authentication?.profile,
        oidcProfileSync,
        existingUser.profile
      );
      await existingUser.update(
        {
          ...(isOIDCAuth && !oidcProfileSync.name ? {} : { name }),
          ...(isOIDCAuth && !oidcProfileSync.email ? {} : { email }),
          ...(profile ? { profile } : {}),
          avatarUrl,
          lastActiveAt: new Date(),
          lastActiveIp: ctx.ip,
        },
        {
          transaction,
        }
      );

      // Only need to associate the authentication with the user if there is one.
      if (!authentication) {
        return null;
      }

      return await existingUser.$create<UserAuthentication>(
        "authentication",
        authentication,
        {
          transaction,
        }
      );
    });

    if (isInvite) {
      const inviter = await existingUser.$get("invitedBy");
      if (inviter) {
        await new InviteAcceptedEmail({
          to: inviter.email,
          inviterId: inviter.id,
          invitedName: existingUser.name,
          teamUrl: existingUser.team.url,
        }).schedule();
      }
    }

    // For OIDC/Keycloak: Restore user to previous groups if they were deactivated
    const userPreferencesData = existingUser.getDataValue("preferences") as any;
    if (isOIDCAuth && userPreferencesData?.previousGroupIds) {
      try {
        const previousGroupIds = userPreferencesData.previousGroupIds as string[];
        const deactivatedCollectionName = "Деактивированные пользователи";

        // Find and remove user from deactivated collection
        const deactivatedCollection = await Collection.findOne({
          where: {
            teamId,
            name: deactivatedCollectionName,
          },
          ...(ctx.state.transaction ? { transaction: ctx.state.transaction } : {}),
        });

        if (deactivatedCollection) {
          const membership = await UserMembership.findOne({
            where: {
              collectionId: deactivatedCollection.id,
              userId: existingUser.id,
            },
            ...(ctx.state.transaction ? { transaction: ctx.state.transaction } : {}),
          });

          if (membership) {
            await membership.destroy({
              ...(ctx.state.transaction ? { transaction: ctx.state.transaction } : {}),
            });
            Logger.info(
              "authentication",
              "Removed user from deactivated collection",
              {
                userId: existingUser.id,
                collectionId: deactivatedCollection.id,
              }
            );
          }
        }

        // Restore user to previous groups
        for (const groupId of previousGroupIds) {
          const group = await Group.findByPk(groupId, {
            ...(ctx.state.transaction ? { transaction: ctx.state.transaction } : {}),
          });

          if (group && group.teamId === teamId) {
            const [groupUser] = await GroupUser.findOrCreate({
              where: {
                groupId: group.id,
                userId: existingUser.id,
              },
              defaults: {
                groupId: group.id,
                userId: existingUser.id,
                permission: GroupPermission.Member,
                createdById: existingUser.id,
              },
              ...(ctx.state.transaction ? { transaction: ctx.state.transaction } : {}),
            });

            Logger.info(
              "authentication",
              "Restored user to previous group",
              {
                userId: existingUser.id,
                groupId: group.id,
                groupName: group.name,
              }
            );
          }
        }

        // Clear previousGroupIds from preferences
        const updatedPreferences = { ...userPreferencesData };
        delete updatedPreferences.previousGroupIds;
        delete updatedPreferences.deactivatedAt;
        existingUser.setDataValue("preferences", updatedPreferences);
        await existingUser.save({
          ...(ctx.state.transaction ? { transaction: ctx.state.transaction } : {}),
        });

        Logger.info(
          "authentication",
          "Restored deactivated user to previous groups",
          {
            userId: existingUser.id,
            restoredGroupsCount: previousGroupIds.length,
          }
        );
      } catch (err) {
        Logger.warn(
          "Failed to restore deactivated user to previous groups",
          {
            error: err,
            userId: existingUser.id,
          }
        );
      }
    }

    // For OIDC/Keycloak: Automatically add user to domain-based group
    if (isOIDCAuth && email) {
      try {
        await domainGroupProvisioner(ctx, existingUser, email);
      } catch (err) {
        Logger.warn(
          "Failed to provision domain group for existing user",
          {
            error: err,
            userId: existingUser.id,
            email,
          }
        );
      }
    }

    // For OIDC/Keycloak: Automatically add user to department-based group
    if (isOIDCAuth && department) {
      try {
        await departmentGroupProvisioner(ctx, existingUser, department);
      } catch (err) {
        Logger.warn(
          "Failed to provision department group for existing user",
          {
            error: err,
            userId: existingUser.id,
            department,
          }
        );
      }
    }

    return {
      user: existingUser,
      authentication: userAuth,
      isNewUser: isInvite,
    };
  } else if (!authentication && !team?.allowedDomains.length) {
    // There's no existing invite or user that matches the external auth email
    // and there is no possibility of matching an allowed domain.
    throw InvalidAuthenticationError(
      "No matching user for email or allowed domain"
    );
  }

  //
  // No auth, no user – this is an entirely new sign in.
  //

  const transaction = await User.sequelize!.transaction();

  try {
    // If the team settings are set to require invites, and there's no existing user record,
    // throw an error and fail user creation.
    if (team?.inviteRequired) {
      Logger.info("authentication", "Sign in without invitation", {
        teamId: team.id,
        email,
      });
      throw InviteRequiredError();
    }

    // If the team settings do not allow this domain,
    // throw an error and fail user creation.
    if (team && !(await team.isDomainAllowed(email))) {
      throw DomainNotAllowedError();
    }

    const profile = buildProfileUpdate(
      authentication?.profile,
      oidcProfileSync,
      null
    );
    const user = await User.createWithCtx(
      ctx,
      {
        name,
        email,
        language,
        role: role ?? team?.defaultUserRole,
        teamId,
        avatarUrl,
        ...(profile ? { profile } : {}),
        authentications: authentication ? [authentication] : [],
        lastActiveAt: new Date(),
        lastActiveIp: ctx.ip,
      } as Partial<InferCreationAttributes<User>>,
      undefined,
      {
        include: "authentications",
      }
    );
    await transaction.commit();

    // For OIDC/Keycloak: Automatically add user to domain-based group
    if (isOIDCAuth && email) {
      try {
        // Create a new context with the transaction committed
        const newCtx = createContext({
          user,
          ip: ctx.ip,
          authType: ctx.state.auth?.type,
          transaction: undefined,
        });
        await domainGroupProvisioner(newCtx, user, email);
      } catch (err) {
        Logger.warn(
          "Failed to provision domain group for new user",
          {
            error: err,
            userId: user.id,
            email,
          }
        );
      }
    }

    // For OIDC/Keycloak: Automatically add user to department-based group
    if (isOIDCAuth && department) {
      try {
        // Create a new context with the transaction committed
        const newCtx = createContext({
          user,
          ip: ctx.ip,
          authType: ctx.state.auth?.type,
          transaction: undefined,
        });
        await departmentGroupProvisioner(newCtx, user, department);
      } catch (err) {
        Logger.warn(
          "Failed to provision department group for new user",
          {
            error: err,
            userId: user.id,
            department,
          }
        );
      }
    }

    return {
      user,
      authentication: user.authentications[0],
      isNewUser: true,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
