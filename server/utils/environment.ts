import fs from "node:fs";
import path from "node:path";
import dotenv from "@dotenvx/dotenvx";

let environment: Record<string, string> = {};

const envPath = path.resolve(process.cwd(), `.env`);
const envDefault = fs.existsSync(envPath)
  ? dotenv.parse(fs.readFileSync(envPath, "utf8"))
  : {};

// Load environment specific variables, in reverse order of precedence
const environments = ["production", "development", "local", "test"];

for (const env of environments) {
  const isEnv = process.env.NODE_ENV === env || envDefault.NODE_ENV === env;
  const isLocalDevelopment =
    env === "local" &&
    (process.env.NODE_ENV === "development" ||
      envDefault.NODE_ENV === "development");

  if (isEnv || isLocalDevelopment) {
    const resolvedPath = path.resolve(process.cwd(), `.env.${env}`);
    if (fs.existsSync(resolvedPath)) {
      environment = {
        ...environment,
        ...dotenv.parse(fs.readFileSync(resolvedPath, "utf8")),
      };
    }
  }
}

process.env = {
  ...envDefault,
  ...environment,
  ...process.env,
};

/**
 * Process environment variables with _FILE suffix by reading the referenced
 * file and setting the base variable. If the base variable is already set, the
 * file is not read. File contents are trimmed of leading/trailing whitespace.
 *
 * @param env - the environment record to process.
 */
export function resolveFileSecrets(
  env: Record<string, string | undefined>
): void {
  for (const key of Object.keys(env)) {
    if (key.endsWith("_FILE")) {
      const baseKey = key.slice(0, -5);
      if (!baseKey.length) {
        continue;
      }

      const filePath = env[key];

      if (!filePath) {
        continue;
      }

      if (env[baseKey] !== undefined) {
        continue;
      }

      try {
        env[baseKey] = fs.readFileSync(filePath, "utf8").trim();
      } catch (err) {
        // oxlint-disable-next-line no-console
        console.error(
          `Failed to read file for ${key} (${filePath}): ${(err as Error).message}`
        );
      }
    }
  }
}

resolveFileSecrets(process.env);

export default process.env;
