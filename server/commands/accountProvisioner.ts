import invariant from "invariant";
import { UniqueConstraintError } from "sequelize";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import {
  AuthenticationError,
  InvalidAuthenticationError,
  EmailAuthenticationRequiredError,
  AuthenticationProviderDisabledError,
} from "@server/errors";
import { APM } from "@server/logging/tracing";
import { AuthenticationProvider, Collection, Team, User } from "@server/models";
import teamProvisioner from "./teamProvisioner";
import userProvisioner from "./userProvisioner";

type Props = {
  ip: string;
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    username?: string;
  };
  team: {
    teamId?: string;
    name: string;
    domain?: string;
    subdomain: string;
    avatarUrl?: string | null;
  };
  authenticationProvider: {
    name: string;
    /* The external ID of the SSO provider */
    providerId: string;
  };
  authentication: {
    /* The external ID of the user SSO record */
    providerId: string;
    scopes: string[];
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  };
};

export type AccountProvisionerResult = {
  user: User;
  team: Team;
  isNewTeam: boolean;
  isNewUser: boolean;
};

async function accountProvisioner({
  ip,
  user: userParams,
  team: teamParams,
  authenticationProvider: authenticationProviderParams,
  authentication: authenticationParams,
}: Props): Promise<AccountProvisionerResult> {
  let result;
  let emailMatchOnly;

  try {
    result = await teamProvisioner({
      ...teamParams,
      authenticationProvider: authenticationProviderParams,
      ip,
    });
  } catch (err) {
    // The account could not be provisioned for the provided teamId
    // check to see if we can try authentication using email matching only
    if (err.id === "invalid_authentication") {
      const authenticationProvider = await AuthenticationProvider.findOne({
        where: {
          name: authenticationProviderParams.name, // example: "google"
          teamId: teamParams.teamId,
        },
        include: [
          {
            model: Team,
            as: "team",
            required: true,
          },
        ],
      });

      if (authenticationProvider) {
        emailMatchOnly = true;
        result = {
          authenticationProvider,
          team: authenticationProvider.team,
          isNewTeam: false,
        };
      }
    }

    if (!result) {
      throw InvalidAuthenticationError(err.message);
    }
  }

  invariant(result, "Team creator result must exist");
  const { authenticationProvider, team, isNewTeam } = result;

  if (!authenticationProvider.enabled) {
    throw AuthenticationProviderDisabledError();
  }

  try {
    const result = await userProvisioner({
      name: userParams.name,
      email: userParams.email,
      username: userParams.username,
      isAdmin: isNewTeam || undefined,
      avatarUrl: userParams.avatarUrl,
      teamId: team.id,
      emailMatchOnly,
      ip,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        ...authenticationParams,
        expiresAt: authenticationParams.expiresIn
          ? new Date(Date.now() + authenticationParams.expiresIn * 1000)
          : undefined,
      },
    });
    const { isNewUser, user } = result;

    if (isNewUser) {
      await WelcomeEmail.schedule({
        to: user.email,
        teamUrl: team.url,
      });
    }

    if (isNewUser || isNewTeam) {
      let provision = isNewTeam;

      // accounts for the case where a team is provisioned, but the user creation
      // failed. In this case we have a valid previously created team but no
      // onboarding collection.
      if (!isNewTeam) {
        const count = await Collection.count({
          where: {
            teamId: team.id,
          },
        });
        provision = count === 0;
      }

      if (provision) {
        await team.provisionFirstCollection(user.id);
      }
    }

    return {
      user,
      team,
      isNewUser,
      isNewTeam,
    };
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      const exists = await User.findOne({
        where: {
          email: userParams.email,
          teamId: team.id,
        },
      });

      if (exists) {
        throw EmailAuthenticationRequiredError(
          "Email authentication required",
          team.url
        );
      } else {
        throw AuthenticationError(err.message, team.url);
      }
    }

    throw err;
  }
}

export default APM.traceFunction({
  serviceName: "command",
  spanName: "accountProvisioner",
})(accountProvisioner);
