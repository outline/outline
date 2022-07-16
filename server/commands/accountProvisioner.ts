import invariant from "invariant";
import { UniqueConstraintError } from "sequelize";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import {
  AuthenticationError,
  EmailAuthenticationRequiredError,
  AuthenticationProviderDisabledError,
} from "@server/errors";
import { APM } from "@server/logging/tracing";
import { Collection, Team, User } from "@server/models";
import teamCreator from "./teamCreator";
import userCreator from "./userCreator";

type Props = {
  ip: string;
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    username?: string;
  };
  team: {
    name: string;
    domain?: string;
    subdomain: string;
    avatarUrl?: string | null;
  };
  authenticationProvider: {
    name: string;
    providerId: string;
  };
  authentication: {
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

  try {
    result = await teamCreator({
      name: teamParams.name,
      domain: teamParams.domain,
      subdomain: teamParams.subdomain,
      avatarUrl: teamParams.avatarUrl,
      authenticationProvider: authenticationProviderParams,
      ip,
    });
  } catch (err) {
    throw AuthenticationError(err.message);
  }

  invariant(result, "Team creator result must exist");
  const { authenticationProvider, team, isNewTeam } = result;

  if (!authenticationProvider.enabled) {
    throw AuthenticationProviderDisabledError();
  }

  try {
    const result = await userCreator({
      name: userParams.name,
      email: userParams.email,
      username: userParams.username,
      isAdmin: isNewTeam || undefined,
      avatarUrl: userParams.avatarUrl,
      teamId: team.id,
      ip,
      authentication: {
        ...authenticationParams,
        expiresAt: authenticationParams.expiresIn
          ? new Date(Date.now() + authenticationParams.expiresIn * 1000)
          : undefined,
        authenticationProviderId: authenticationProvider.id,
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
