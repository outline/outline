import { requireDirectory } from "@server/utils/fs";

const processors = {};

requireDirectory(__dirname).forEach(([module, id]) => {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'default' does not exist on type 'unknown'
  const { default: Processor } = module;

  if (id === "index") {
    return;
  }

  processors[id] = Processor;
});

export default processors;
