// @flow
import debug from "debug";
import { Team, AuthenticationProvider } from "../models";
import { sequelize } from "../sequelize";
import { generateAvatarUrl } from "../utils/avatars";

const log = debug("server");

type TeamCreatorResult = {|
  team: Team,
  authenticationProvider: AuthenticationProvider,
  isNew: boolean,
|};

export default async function teamCreator({
  name,
  domain,
  subdomain,
  avatarUrl,
  authenticationProvider,
}: {|
  name: string,
  domain?: string,
  subdomain: string,
  avatarUrl?: string,
  authenticationProvider: {|
    name: string,
    providerId: string,
  |},
|}): Promise<TeamCreatorResult> {
  const authP = await AuthenticationProvider.findOne({
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
      isNew: false,
    };
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

  // This team has never been seen before, time to create all the new stuff
  let transaction = await sequelize.transaction();
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
    log(`Provisioning subdomain failed: ${err.message}`);
  }

  return {
    team,
    authenticationProvider: team.authenticationProviders[0],
    isNew: true,
  };
}
