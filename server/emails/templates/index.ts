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

export default emails;
