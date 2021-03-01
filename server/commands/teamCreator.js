// @flow
import { Team, AuthenticationProvider } from "../models";
import { sequelize } from "../sequelize";
import { generateAvatarUrl } from "../utils/avatars";

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
|}): Promise<[Team, boolean]> {
  let team = await Team.findOne({
    include: [
      {
        where: authenticationProvider,
        model: AuthenticationProvider,
        as: "authenticationProviders",
        required: true,
      },
    ],
  });

  // Someone has signed in with this authentication provider before, we just
  // want to update the details instead of creating a new record
  if (team && team.authenticationProviders.length > 0) {
    await team.update({ name });
    return [team, false];
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

  await team.provisionSubdomain(subdomain);
  return [team, true];
}
