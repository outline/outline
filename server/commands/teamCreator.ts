import Logger from "@server/logging/logger";
import { Team, AuthenticationProvider } from "@server/models";
import {
  isDomainAllowed,
  getAllowedDomains,
} from "@server/utils/authentication";
import { generateAvatarUrl } from "@server/utils/avatars";
import { MaximumTeamsError } from "../errors";

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

export default async function teamCreator({
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
  if (process.env.DEPLOYMENT !== "hosted") {
    const team = await Team.findOne();

    if (team) {
      // If there is an allowed list of domains and the domain is within it then
      // we want to assign to the existing team, otherwise we prevent the
      // creation of another team on self-hosted instances.
      if (domain && isDomainAllowed(domain) && getAllowedDomains().length > 0) {
        authP = await team.$create<AuthenticationProvider>(
          "authenticationProvider",
          authenticationProvider
        );
        return {
          authenticationProvider: authP,
          team,
          isNewTeam: false,
        };
      }

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
