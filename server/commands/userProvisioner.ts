import { InferCreationAttributes } from "sequelize";
import { UserRole } from "@shared/types";
import InviteAcceptedEmail from "@server/emails/templates/InviteAcceptedEmail";
import {
  DomainNotAllowedError,
  InvalidAuthenticationError,
  InviteRequiredError,
} from "@server/errors";
import Logger from "@server/logging/Logger";
import { Event, Team, User, UserAuthentication } from "@server/models";
import { sequelize } from "@server/storage/database";

type UserProvisionerResult = {
  user: User;
  isNewUser: boolean;
  authentication: UserAuthentication | null;
};

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
  /** The IP address of the incoming request */
  ip: string;
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
  };
};

export default async function userProvisioner({
  name,
  email,
  role,
  language,
  avatarUrl,
  teamId,
  authentication,
  ip,
}: Props): Promise<UserProvisionerResult> {
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
        ],
      })
    : undefined;

  // Someone has signed in with this authentication before, we just
  // want to update the details instead of creating a new record
  if (auth && authentication) {
    const { providerId, authenticationProviderId, ...rest } = authentication;
    const { user } = auth;

    // We found an authentication record that matches the user id, but it's
    // associated with a different authentication provider, (eg a different
    // hosted google domain). This is possible in Google Auth when moving domains.
    // In the future we may auto-migrate these.
    if (auth.authenticationProviderId !== authenticationProviderId) {
      throw new Error(
        `User authentication ${providerId} already exists for ${auth.authenticationProviderId}, tried to assign to ${authenticationProviderId}`
      );
    }

    if (user) {
      await user.update({
        email,
      });
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

  // A `user` record may exist even if there is no existing authentication record.
  // This is either an invite or a user that's external to the team
  const existingUser = await User.scope([
    "withAuthentications",
    "withTeam",
  ]).findOne({
    where: {
      // Email from auth providers may be capitalized and we should respect that
      // however any existing invites will always be lowercased.
      email: email.toLowerCase(),
      teamId,
    },
  });

  const team = await Team.scope("withDomains").findByPk(teamId, {
    attributes: ["defaultUserRole", "inviteRequired", "id"],
  });

  // We have an existing user, so we need to update it with our
  // new details and count this as a new user creation.
  if (existingUser) {
    // A `user` record might exist in the form of an invite.
    // An invite is a shell user record with no authentication method
    // that's never been active before.
    const isInvite = existingUser.isInvited;

    const auth = await sequelize.transaction(async (transaction) => {
      if (isInvite) {
        await Event.create(
          {
            name: "users.create",
            actorId: existingUser.id,
            userId: existingUser.id,
            teamId: existingUser.teamId,
            data: {
              name,
            },
            ip,
          },
          {
            transaction,
          }
        );
      }

      // Regardless, create a new authentication record
      // against the existing user (user can auth with multiple SSO providers)
      // Update user's name and avatar based on the most recently added provider
      await existingUser.update(
        {
          name,
          avatarUrl,
          lastActiveAt: new Date(),
          lastActiveIp: ip,
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

    return {
      user: existingUser,
      authentication: auth,
      isNewUser: isInvite,
    };
  } else if (!authentication && !team?.allowedDomains.length) {
    // There's no existing invite or user that matches the external auth email
    // and there is no possibility of matching an allowed domain.
    throw InvalidAuthenticationError();
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

    const user = await User.create(
      {
        name,
        email,
        language,
        role: role ?? team?.defaultUserRole,
        teamId,
        avatarUrl,
        authentications: authentication ? [authentication] : [],
      } as Partial<InferCreationAttributes<User>>,
      {
        include: "authentications",
        transaction,
      }
    );
    await Event.create(
      {
        name: "users.create",
        actorId: user.id,
        userId: user.id,
        teamId: user.teamId,
        data: {
          name: user.name,
        },
        ip,
      },
      {
        transaction,
      }
    );
    await transaction.commit();
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
