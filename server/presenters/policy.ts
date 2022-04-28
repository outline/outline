import { APM } from "@server/logging/tracing";
import { User } from "@server/models";

type Policy = {
  id: string;
  abilities: Record<string, boolean>;
};

function present(user: User, objects: Record<string, any>[]): Policy[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { serialize } = require("../policies");

  return objects.map((object) => ({
    id: object.id,
    abilities: serialize(user, object),
  }));
}

export default APM.traceFunction({
  serviceName: "presenter",
  spanName: "policy",
})(present);
