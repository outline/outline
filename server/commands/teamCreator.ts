import invariant from "invariant";
import env from "@server/env";
import { DomainNotAllowedError, MaximumTeamsError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { APM } from "@server/logging/tracing";
import { Team, AuthenticationProvider } from "@server/models";
import { generateAvatarUrl } from "@server/utils/avatars";

type TeamCreatorResult = {
  team: Team;
  authenticationProvider: AuthenticationProvider;
  isNewTeam: boolean;
};

type Props = {
  name: string;
  domain?: string;
  subdomain: string;
  avatarUrl?: string | null;
  authenticationProvider: {
    name: string;
    providerId: string;
  };
};

async function teamCreator({
  name,
  domain,
  subdomain,
  avatarUrl,
  authenticationProvider,
}: Props): Promise<TeamCreatorResult> {
  let authP = await AuthenticationProvider.findOne({
    where: authenticationProvider,
    include: [
      {
        model: Team,
        as: "team",
        required: true,
      },
    ],
  });

  // This authentication provider already exists which means we have a team and
  // there is nothing left to do but return the existing credentials
  if (authP) {
    return {
      authenticationProvider: authP,
      team: authP.team,
      isNewTeam: false,
    };
  }

  // This team has never been seen before, if self hosted the logic is different
  // to the multi-tenant version, we want to restrict to a single team that MAY
  // have multiple authentication providers
  if (env.DEPLOYMENT !== "hosted") {
    const teamCount = await Team.count();

    // If the self-hosted installation has a single team and the domain for the
    // new team is allowed then assign the authentication provider to the
    // existing team
    if (teamCount === 1 && domain) {
      const team = await Team.findOne();
      invariant(team, "Team should exist");

      if (await team.isDomainAllowed(domain)) {
        authP = await team.$create<AuthenticationProvider>(
          "authenticationProvider",
          authenticationProvider
        );
        return {
          authenticationProvider: authP,
          team,
          isNewTeam: false,
        };
      } else {
        throw DomainNotAllowedError();
      }
    }

    if (teamCount >= 1) {
      throw MaximumTeamsError();
    }
  }

  // If the service did not provide a logo/avatar then we attempt to generate
  // one via ClearBit, or fallback to colored initials in worst case scenario
  if (!avatarUrl) {
    avatarUrl = await generateAvatarUrl({
      name,
      domain,
      id: subdomain,
    });
  }

  const transaction = await Team.sequelize!.transaction();
  let team;

  try {
    team = await Team.create(
      {
        name,
        avatarUrl,
        authenticationProviders: [authenticationProvider],
      },
      {
        include: "authenticationProviders",
        transaction,
      }
    );
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  try {
    await team.provisionSubdomain(subdomain);
  } catch (err) {
    Logger.error("Provisioning subdomain failed", err, {
      teamId: team.id,
      subdomain,
    });
  }

  return {
    team,
    authenticationProvider: team.authenticationProviders[0],
    isNewTeam: true,
  };
}

export default APM.traceFunction({
  serviceName: "command",
  spanName: "teamCreator",
})(teamCreator);
