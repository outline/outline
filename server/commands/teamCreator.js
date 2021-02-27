// @flow
import { Team, AuthenticationProvider } from "../models";
import { sequelize } from "../sequelize";

export default async function teamCreator({
  name,
  domain,
  avatarUrl,
  authenticationProvider,
}: {
  name: string,
  domain: string,
  avatarUrl: string,
  authenticationProvider: {
    serviceId: string,
    name: string,
    accessToken?: string,
    refreshToken?: string,
  },
}): Promise<[Team, boolean]> {
  const provider = await AuthenticationProvider.findOne({
    where: authenticationProvider,
    include: [
      {
        model: Team,
        as: "team",
      },
    ],
  });

  // Someone has signed in with this authentication provider before, we just
  // want to update the details instead of creating a new record
  if (provider) {
    const { team } = provider;

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

    const team = await Team.create(
      {
        name,
        avatarUrl,
        authenticationProvider,
      },
      {
        include: "authenticationProvider",
        transaction,
      }
    );

    await team.provisionSubdomain(domain, { transaction });
    await transaction.commit();

    return [team, true];
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
  }
}
