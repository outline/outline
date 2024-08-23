import compact from "lodash/compact";
import { traceFunction } from "@server/logging/tracing";
import { User } from "@server/models";
import { serialize } from "../policies";

type Policy = {
  id: string;
  abilities: Record<string, boolean>;
};

function presentPolicy(
  user: User,
  objects: (Parameters<typeof serialize>[1] | null)[]
): Policy[] {
  return compact(objects).map((object) => ({
    id: object.id,
    abilities: serialize(user, object),
  }));
}

export default traceFunction({
  spanName: "presenters",
})(presentPolicy);
