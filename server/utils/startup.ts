import chalk from "chalk";
import isEmpty from "lodash/isEmpty";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import AuthenticationProvider from "@server/models/AuthenticationProvider";
import Team from "@server/models/Team";
import { migrations } from "@server/storage/database";
import { getArg } from "./args";

export async function checkPendingMigrations() {
  try {
    const pending = await migrations.pending();
    if (!isEmpty(pending)) {
      if (getArg("no-migrate")) {
        Logger.warn(
          chalk.red(
            `Database migrations are pending and were not ran because --no-migrate flag was passed.\nRun the migrations with "yarn db:migrate".`
          )
        );
        process.exit(1);
      } else {
        Logger.info("database", "Running migrations…");
        await migrations.up();
      }
    }
    await checkDataMigrations();
  } catch (err) {
    if (err.message.includes("ECONNREFUSED")) {
      Logger.warn(
        chalk.red(
          `Could not connect to the database. Please check your connection settings.`
        )
      );
    } else {
      Logger.warn(chalk.red(err.message));
    }
    process.exit(1);
  }
}

export async function checkDataMigrations() {
  if (env.isCloudHosted) {
    return;
  }

  const team = await Team.findOne();
  const provider = await AuthenticationProvider.findOne();

  if (
    env.isProduction &&
    team &&
    team.createdAt < new Date("2024-01-01") &&
    !provider
  ) {
    Logger.warn(`
This version of Outline cannot start until a data migration is complete.
Backup your database, run the database migrations and the following script:
(Note: script run needed only when upgrading to any version between 0.54.0 and 0.61.1, including both)

$ node ./build/server/scripts/20210226232041-migrate-authentication.js
`);
    process.exit(1);
  }
}

export async function printEnv() {
  if (env.isProduction) {
    Logger.info(
      "lifecycle",
      chalk.green(`
Is your team enjoying Outline? Consider supporting future development by sponsoring the project:\n\nhttps://github.com/sponsors/outline
`)
    );
  } else if (env.isDevelopment) {
    Logger.warn(
      `Running Outline in ${chalk.bold(
        "development mode"
      )}. To run Outline in production mode set the ${chalk.bold(
        "NODE_ENV"
      )} env variable to "production"`
    );
  }
}
