import { styleText } from "node:util";
import isEmpty from "lodash/isEmpty";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import AuthenticationProvider from "@server/models/AuthenticationProvider";
import Team from "@server/models/Team";
import { migrations } from "@server/storage/database";
import { getArg } from "./args";
import { MutexLock } from "./MutexLock";
import { Minute } from "@shared/utils/time";

export async function checkPendingMigrations() {
  let lock;
  try {
    lock = await MutexLock.acquire("migrations", 10 * Minute.ms, {
      releaseOnShutdown: true,
    });

    const pending = await migrations.pending();
    if (!isEmpty(pending)) {
      if (getArg("no-migrate")) {
        Logger.fatal(
          styleText(
            "red",
            `Database migrations are pending and were not ran because --no-migrate flag was passed.\nRun the migrations with "yarn db:migrate".`
          ),
          new Error("Migrations pending")
        );
      } else {
        Logger.info("database", "Running migrations…");
        await migrations.up();
      }
    }
    await checkDataMigrations();
  } catch (err) {
    if (err.message.includes("ECONNREFUSED")) {
      Logger.fatal(
        styleText(
          "red",
          `Could not connect to the database. Please check your connection settings.`
        ),
        err
      );
    } else {
      Logger.fatal(styleText("red", err.message), err);
    }
  } finally {
    if (lock) {
      await MutexLock.release(lock);
    }
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
    Logger.fatal(
      `
This version of Outline cannot start until a data migration is complete.
Backup your database, run the database migrations and the following script:
(Note: script run needed only when upgrading to any version between 0.54.0 and 0.61.1, including both)

$ node ./build/server/scripts/20210226232041-migrate-authentication.js
`,
      new Error("Data migration required")
    );
  }
}

export async function printEnv() {
  if (env.isProduction) {
    Logger.info(
      "lifecycle",
      styleText(
        "green",
        `
Is your team enjoying Outline? Consider supporting future development by sponsoring the project:\n\nhttps://github.com/sponsors/outline
`
      )
    );
  } else if (env.isDevelopment) {
    Logger.warn(
      `Running Outline in ${styleText(
        "bold",
        "development mode"
      )}. To run Outline in production mode set the ${styleText(
        "bold",
        "NODE_ENV"
      )} env variable to "production"`
    );
  }
}
