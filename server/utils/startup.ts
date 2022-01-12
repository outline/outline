import chalk from "chalk";
import Logger from "@server/logging/logger";
import AuthenticationProvider from "@server/models/AuthenticationProvider";
import Team from "@server/models/Team";

export async function checkMigrations() {
  if (process.env.DEPLOYMENT === "hosted") {
    return;
  }

  const teams = await Team.count();
  const providers = await AuthenticationProvider.count();

  if (teams && !providers) {
    Logger.warn(`
This version of Outline cannot start until a data migration is complete.
Backup your database, run the database migrations and the following script:

$ node ./build/server/scripts/20210226232041-migrate-authentication.js
`);
    process.exit(1);
  }
}

export function checkEnv() {
  const errors = [];

  if (
    !process.env.SECRET_KEY ||
    process.env.SECRET_KEY === "generate_a_new_key"
  ) {
    errors.push(
      `The ${chalk.bold(
        "SECRET_KEY"
      )} env variable must be set with the output of ${chalk.bold(
        "$ openssl rand -hex 32"
      )}`
    );
  }

  if (
    !process.env.UTILS_SECRET ||
    process.env.UTILS_SECRET === "generate_a_new_key"
  ) {
    errors.push(
      `The ${chalk.bold(
        "UTILS_SECRET"
      )} env variable must be set with a secret value, it is recommended to use the output of ${chalk.bold(
        "$ openssl rand -hex 32"
      )}`
    );
  }

  if (process.env.AWS_ACCESS_KEY_ID) {
    [
      "AWS_REGION",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_S3_UPLOAD_BUCKET_URL",
      "AWS_S3_UPLOAD_MAX_SIZE",
    ].forEach((key) => {
      if (!process.env[key]) {
        errors.push(
          `The ${chalk.bold(
            key
          )} env variable must be set when using S3 compatible storage`
        );
      }
    });
  }

  if (!process.env.URL) {
    errors.push(
      `The ${chalk.bold(
        "URL"
      )} env variable must be set to the fully qualified, externally accessible URL, e.g https://wiki.mycompany.com`
    );
  }

  if (!process.env.DATABASE_URL && !process.env.DATABASE_CONNECTION_POOL_URL) {
    errors.push(
      `The ${chalk.bold(
        "DATABASE_URL"
      )} env variable must be set to the location of your postgres server, including username, password, and port`
    );
  }

  if (!process.env.REDIS_URL) {
    errors.push(
      `The ${chalk.bold(
        "REDIS_URL"
      )} env variable must be set to the location of your redis server, including username, password, and port`
    );
  }

  if (errors.length) {
    Logger.warn(
      "\n\nThe server could not start, please fix the following configuration errors and try again:\n" +
        errors.map((e) => `- ${e}`).join("\n")
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production") {
    Logger.info(
      "lifecycle",
      chalk.green(`
Is your team enjoying Outline? Consider supporting future development by sponsoring the project:\n\nhttps://github.com/sponsors/outline
`)
    );
  } else if (process.env.NODE_ENV === "development") {
    Logger.warn(
      `Running Outline in ${chalk.bold(
        "development mode"
      )}. To run Outline in production mode set the ${chalk.bold(
        "NODE_ENV"
      )} env variable to "production"`
    );
  }
}
