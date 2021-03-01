// @flow
import "./bootstrap";
import debug from "debug";
import {
  Team,
  User,
  AuthenticationProvider,
  UserAuthentication,
} from "../models";
import { Op } from "../sequelize";

const log = debug("script");

async function main() {
  let page = 0;
  let limit = 1000;
  const cache = {};

  const work = async (page: number) => {
    log(`Migrating authentication data… page ${page}`);

    const users = await User.findAll({
      limit,
      offset: page * limit,
      paranoid: false,
      where: {
        serviceId: {
          [Op.ne]: "email",
        },
      },
      include: [
        {
          model: Team,
          as: "team",
          required: true,
          paranoid: false,
        },
      ],
    });

    for (const user of users) {
      for (const provider of ["slack", "google"]) {
        const providerId = user.team[`${provider}Id`];
        if (!providerId) {
          continue;
        }

        let authenticationProviderId = cache[providerId];
        if (!authenticationProviderId) {
          const [
            authenticationProvider,
          ] = await AuthenticationProvider.findOrCreate({
            where: {
              name: provider,
              providerId,
              teamId: user.teamId,
            },
          });

          cache[providerId] = authenticationProviderId =
            authenticationProvider.id;
        }

        try {
          await UserAuthentication.create({
            authenticationProviderId,
            providerId: user.serviceId,
            teamId: user.teamId,
            userId: user.id,
          });
        } catch (err) {
          console.log(
            `serviceId ${user.serviceId} exists, for user ${user.id}`
          );
          continue;
        }
      }
    }

    return users.length === limit ? work(page + 1) : undefined;
  };

  await work(page);
  process.exit(0);
}

main();
