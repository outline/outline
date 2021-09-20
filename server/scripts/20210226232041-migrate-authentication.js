// @flow
import "./bootstrap";
import Logger from "../logging/logger";
import {
  Team,
  User,
  AuthenticationProvider,
  UserAuthentication,
} from "../models";
import { Op } from "../sequelize";

const cache = {};
let page = 0;
let limit = 100;

export default async function main(exit = false) {
  const work = async (page: number) => {
    Logger.info("database", "Starting authentication migration");

    const users = await User.findAll({
      limit,
      offset: page * limit,
      paranoid: false,
      order: [["createdAt", "ASC"]],
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
      const provider = user.service;
      const providerId = user.team[`${provider}Id`];
      if (!providerId) {
        Logger.info(
          "database",
          `User ${user.id} has serviceId ${user.serviceId}, but team ${provider}Id missing`
        );
        continue;
      }
      if (providerId.startsWith("transferred")) {
        Logger.info(
          "database",
          `skipping previously transferred ${user.team.name} (${user.team.id})`
        );
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
        Logger.info(
          "database",
          `serviceId ${user.serviceId} exists, for user ${user.id}`
        );
        continue;
      }
    }

    return users.length === limit ? work(page + 1) : undefined;
  };

  await work(page);

  if (exit) {
    Logger.info("database", "Migration complete");
    process.exit(0);
  }
}

// In the test suite we import the script rather than run via node CLI
if (process.env.NODE_ENV !== "test") {
  main(true);
}
