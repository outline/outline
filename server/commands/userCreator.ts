import { Op } from "sequelize";
import { DomainNotAllowedError, InviteRequiredError } from "@server/errors";
import { Event, Team, User, UserAuthentication } from "@server/models";

type UserCreatorResult = {
  user: User;
  isNewUser: boolean;
  authentication: UserAuthentication;
};

type Props = {
  name: string;
  email: string;
  username?: string;
  isAdmin?: boolean;
  avatarUrl?: string | null;
  teamId: string;
  ip: string;
  authentication: {
    authenticationProviderId: string;
    providerId: string;
    scopes: string[];
    accessToken?: string;
    refreshToken?: string;
  };
};

export default async function userCreator({
  name,
  email,
  username,
  isAdmin,
  avatarUrl,
  teamId,
  authentication,
  ip,
}: Props): Promise<UserCreatorResult> {
  const { authenticationProviderId, providerId, ...rest } = authentication;
  const auth = await UserAuthentication.findOne({
    where: {
      providerId,
    },
    include: [
      {
        model: User,
        as: "user",
      },
    ],
  });

  // Someone has signed in with this authentication before, we just
  // want to update the details instead of creating a new record
  if (auth) {
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
        username,
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

  // A `user` record might exist in the form of an invite even if there is no
  // existing authentication record that matches. In Outline an invite is a
  // shell user record.
  const invite = await User.findOne({
    where: {
      // Email from auth providers may be capitalized and we should respect that
      // however any existing invites will always be lowercased.
      email: email.toLowerCase(),
      teamId,
      lastActiveAt: {
        [Op.is]: null,
      },
    },
    include: [
      {
        model: UserAuthentication,
        as: "authentications",
        required: false,
      },
    ],
  });

  // We have an existing invite for his user, so we need to update it with our
  // new details and link up the authentication method
  if (invite && !invite.authentications.length) {
    const transaction = await User.sequelize!.transaction();
    let auth;

    try {
      await invite.update(
        {
          name,
          avatarUrl,
        },
        {
          transaction,
        }
      );
      auth = await invite.$create<UserAuthentication>(
        "authentication",
        authentication,
        {
          transaction,
        }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    return {
      user: invite,
      authentication: auth,
      isNewUser: true,
    };
  }

  // No auth, no user – this is an entirely new sign in.
  const transaction = await User.sequelize!.transaction();

  try {
    const team = await Team.findByPk(teamId, {
      attributes: ["defaultUserRole", "inviteRequired", "id"],
      transaction,
    });

    // If the team settings are set to require invites, and the user is not already invited,
    // throw an error and fail user creation.
    if (team?.inviteRequired && !invite) {
      throw InviteRequiredError();
    }

    // If the team settings do not allow this domain,
    // throw an error and fail user creation.
    const domain = email.split("@")[1];
    if (team && !(await team.isDomainAllowed(domain))) {
      throw DomainNotAllowedError();
    }

    const defaultUserRole = team?.defaultUserRole;

    const user = await User.create(
      {
        name,
        email,
        username,
        isAdmin: typeof isAdmin === "boolean" && isAdmin,
        isViewer: isAdmin === true ? false : defaultUserRole === "viewer",
        teamId,
        avatarUrl,
        service: null,
        authentications: [authentication],
      },
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
