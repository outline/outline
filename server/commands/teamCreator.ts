import Logger from "@server/logging/logger";
import { Team, AuthenticationProvider } from "@server/models";
import { getAllowedDomains } from "@server/utils/authentication";
import { generateAvatarUrl } from "@server/utils/avatars";
import { MaximumTeamsError } from "../errors";
import { sequelize } from "../sequelize";

type TeamCreatorResult = {
  // @ts-expect-error ts-migrate(2749) FIXME: 'Team' refers to a value, but is being used as a t... Remove this comment to see the full error message
  team: Team;
  // @ts-expect-error ts-migrate(2749) FIXME: 'AuthenticationProvider' refers to a value, but is... Remove this comment to see the full error message
  authenticationProvider: AuthenticationProvider;
  isNewTeam: boolean;
};

export default async function teamCreator({
  name,
  domain,
  subdomain,
  avatarUrl,
  authenticationProvider,
}: {
  name: string;
  domain?: string;
  subdomain: string;
  avatarUrl?: string;
  authenticationProvider: {
    name: string;
    providerId: string;
  };
}): Promise<TeamCreatorResult> {
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
    const teamCount = await Team.count();

    // If the self-hosted installation has a single team and the domain for the
    // new team matches one in the allowed domains env variable then assign the
    // authentication provider to the existing team
    if (teamCount === 1 && domain && getAllowedDomains().includes(domain)) {
      const team = await Team.findOne();
      authP = await team.createAuthenticationProvider(authenticationProvider);
      return {
        authenticationProvider: authP,
        team,
        isNewTeam: false,
      };
    }

    if (teamCount >= 1) {
      // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
      throw new MaximumTeamsError();
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

  const transaction = await sequelize.transaction();
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
