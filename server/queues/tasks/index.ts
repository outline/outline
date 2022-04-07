import { requireDirectory } from "@server/utils/fs";

const tasks = {};

requireDirectory(__dirname).forEach(([module, id]) => {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'default' does not exist on type 'unknown'
  const { default: Task } = module;

  if (id === "index") {
    return;
  }

  tasks[id] = Task;
});

export default tasks;
