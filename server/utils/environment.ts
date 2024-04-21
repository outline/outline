import fs from "fs";
import path from "path";
import dotenv from "dotenv";

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

export default process.env;
