// @flow
require("dotenv").config({ silent: true });

const errors = [];
const boxen = require("boxen");
const chalk = require("chalk");
const throng = require("throng");

// If the DataDog agent is installed and the DD_API_KEY environment variable is
// in the environment then we can safely attempt to start the DD tracer
if (process.env.DD_API_KEY) {
  require("dd-trace").init({
    // SOURCE_COMMIT is used by Docker Hub
    // SOURCE_VERSION is used by Heroku
    version: process.env.SOURCE_COMMIT || process.env.SOURCE_VERSION,
  });
}

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

if (!process.env.DATABASE_URL) {
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
  console.log(
    chalk.bold.red(
      "\n\nThe server could not start, please fix the following configuration errors and try again:\n"
    )
  );
  errors.map((text) => console.log(`  - ${text}`));
  console.log("\n");
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.log(
    boxen(
      `
Is your team enjoying Outline? Consider supporting future development by sponsoring the project:\n\nhttps://github.com/sponsors/outline
`,
      { padding: 1, margin: 1, borderStyle: "double", borderColor: "green" }
    )
  );
} else if (process.env.NODE_ENV === "development") {
  console.log(
    chalk.yellow(
      `\nRunning Outline in development mode. To run Outline in production mode set the ${chalk.bold(
        "NODE_ENV"
      )} env variable to "production"\n`
    )
  );
}

const { start } = require("./main");

throng({
  worker: start,
  count: process.env.WEB_CONCURRENCY || 1,
});
