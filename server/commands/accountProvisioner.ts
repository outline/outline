import invariant from "invariant";
import Sequelize from "sequelize";
import { Collection, Team, User } from "@server/models";
import {
  AuthenticationError,
  EmailAuthenticationRequiredError,
  AuthenticationProviderDisabledError,
} from "../errors";
import mailer from "../mailer";
import teamCreator from "./teamCreator";
import userCreator from "./userCreator";

type Props = {
  ip: string;
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
    username?: string;
  };
  team: {
    name: string;
    domain?: string;
    subdomain: string;
    avatarUrl?: string;
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
  };
};

export type AccountProvisionerResult = {
  // @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
  user: User;
  // @ts-expect-error ts-migrate(2749) FIXME: 'Team' refers to a value, but is being used as a t... Remove this comment to see the full error message
  team: Team;
  isNewTeam: boolean;
  isNewUser: boolean;
};

export default async function accountProvisioner({
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
    });
  } catch (err) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new AuthenticationError(err.message);
  }

  invariant(result, "Team creator result must exist");
  const { authenticationProvider, team, isNewTeam } = result;

  if (!authenticationProvider.enabled) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new AuthenticationProviderDisabledError();
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
        authenticationProviderId: authenticationProvider.id,
      },
    });
    const { isNewUser, user } = result;

    if (isNewUser) {
      await mailer.sendTemplate("welcome", {
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
    if (err instanceof Sequelize.UniqueConstraintError) {
      const exists = await User.findOne({
        where: {
          email: userParams.email,
          teamId: team.id,
        },
      });

      if (exists) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new EmailAuthenticationRequiredError(
          "Email authentication required",
          team.url
        );
      } else {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new AuthenticationError(err.message, team.url);
      }
    }

    throw err;
  }
}
