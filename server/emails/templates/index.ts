import path from "path";
import { glob } from "glob";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { requireDirectory } from "@server/utils/fs";

const emails = {};

requireDirectory(__dirname).forEach(([module, id]) => {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'default' does not exist on type 'unknown'
  const { default: Email } = module;

  if (id === "index") {
    return;
  }

  emails[id] = Email;
});

const rootDir = env.ENVIRONMENT === "test" ? "" : "build";
glob
  .sync(path.join(rootDir, "plugins/*/server/email/templates/!(*.test).[jt]s"))
  .forEach((filePath: string) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const template = require(path.join(process.cwd(), filePath)).default;

    Logger.debug("lifecycle", `Registered email template ${template.name}`);

    emails[template.name] = template;
  });

export default emails;
