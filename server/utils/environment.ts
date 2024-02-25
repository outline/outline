import fs from "fs";
import path from "path";
import dotenv from "dotenv";

let environment: Record<string, string> = {};

const envPath = path.resolve(process.cwd(), `.env`);
const envDefault = fs.existsSync(envPath)
  ? dotenv.parse(fs.readFileSync(envPath, "utf8"))
  : {};

// Load environment specific variables, in reverse order of precedenceq
const environments = ["production", "development", "local", "test"];

for (const env of environments) {
  if (process.env.NODE_ENV === env || envDefault.NODE_ENV === env) {
    const resolvedPath = path.resolve(process.cwd(), `.env.${env}`);
    if (fs.existsSync(resolvedPath)) {
      environment = dotenv.parse(fs.readFileSync(resolvedPath, "utf8"));
    }
  }
}

export default {
  ...process.env,
  ...envDefault,
  ...environment,
};
