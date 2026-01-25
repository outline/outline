import teamCreator from "@server/commands/teamCreator";
import { createContext } from "@server/context";
import env from "@server/env";
import {
  DomainNotAllowedError,
  InvalidAuthenticationError,
  TeamPendingDeletionError,
} from "@server/errors";
import Logger from "@server/logging/Logger";
import { traceFunction } from "@server/logging/tracing";
import { Team, AuthenticationProvider } from "@server/models";
import { sequelize } from "@server/storage/database";
import type { APIContext } from "@server/types";

type TeamProvisionerResult = {
  team: Team;
  authenticationProvider: AuthenticationProvider;
  isNewTeam: boolean;
};

type Props = {
  /**
   * The internal ID of the team that is being logged into based on the
   * subdomain that the request came from, if any.
   */
  teamId?: string;
  /** The displayed name of the team */
  name: string;
  /** The domain name from the email of the user logging in */
  domain?: string;
  /** The preferred subdomain to provision for the team if not yet created */
  subdomain: string;
  /** The public url of an image representing the team */
  avatarUrl?: string | null;
  /** Details of the authentication provider being used */
  authenticationProvider: {
    /** The name of the authentication provider, eg "google" */
    name: string;
    /** External identifier of the authentication provider */
    providerId: string;
  };
};

async function teamProvisioner(
  ctx: APIContext,
  { teamId, name, domain, subdomain, avatarUrl, authenticationProvider }: Props
): Promise<TeamProvisionerResult> {
  let authP = await AuthenticationProvider.findOne({
    where: teamId
      ? { ...authenticationProvider, teamId }
      : authenticationProvider,
    include: [
      {
        model: Team,
        as: "team",
        required: true,
        paranoid: false,
      },
    ],
    order: [
      [Team, "deletedAt", "DESC"],
      ["enabled", "DESC"],
    ],
  });

  // This authentication provider already exists which means we have a team and
  // there is nothing left to do but return the existing credentials
  if (authP) {
    if (authP.team.deletedAt) {
      throw TeamPendingDeletionError();
    }

    return {
      authenticationProvider: authP,
      team: authP.team,
      isNewTeam: false,
    };
  } else if (teamId) {
    // The user is attempting to log into a team with an unfamiliar SSO provider
    if (env.isCloudHosted) {
      const err = InvalidAuthenticationError();
      Logger.error("Authentication provider does not exist for team", err, {
        authenticationProvider,
        teamId,
      });
      throw err;
    }

    // This team + auth provider combination has not been seen before in self hosted
    const existingTeam = await Team.findByPk(teamId, {
      rejectOnEmpty: true,
    });

    // If the self-hosted installation has a single team and the domain for the
    // new team is allowed then assign the authentication provider to the
    // existing team
    if (domain) {
      if (await existingTeam.isDomainAllowed(domain)) {
        authP = await existingTeam.$create<AuthenticationProvider>(
          "authenticationProvider",
          authenticationProvider
        );
        return {
          authenticationProvider: authP,
          team: existingTeam,
          isNewTeam: false,
        };
      }
      throw DomainNotAllowedError();
    }
    throw InvalidAuthenticationError();
  }

  // We cannot find an existing team, so we create a new one
  const team = await sequelize.transaction((transaction) =>
    teamCreator(createContext({ transaction }), {
      name,
      domain,
      subdomain,
      avatarUrl,
      authenticationProviders: [authenticationProvider],
    })
  );

  return {
    team,
    authenticationProvider: team.authenticationProviders[0],
    isNewTeam: true,
  };
}

export default traceFunction({
  spanName: "teamProvisioner",
})(teamProvisioner);
