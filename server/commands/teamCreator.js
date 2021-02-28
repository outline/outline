// @flow
import { Team, AuthenticationProvider } from "../models";
import { sequelize } from "../sequelize";

export default async function teamCreator({
  name,
  subdomain,
  avatarUrl,
  authenticationProvider,
}: {|
  name: string,
  subdomain: string,
  avatarUrl: string,
  authenticationProvider: {|
    name: string,
    serviceId: string,
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
    await team.update({
      name,
      avatarUrl,
    });

    return [team, false];
  }

  // This team has never been seen before, time to create all the new stuff
  let transaction;
  try {
    transaction = await sequelize.transaction();

    let team = await Team.create(
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

    await team.provisionSubdomain(subdomain, { transaction });
    await transaction.commit();

    return [team, true];
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
  }
}
