import compact from "lodash/compact";
import { traceFunction } from "@server/logging/tracing";
import type { User } from "@server/models";
import { serialize } from "../policies";

type Policy = {
  id: string;
  abilities: Record<string, boolean | string[]>;
};

function presentPolicy(
  user: User,
  models: (Parameters<typeof serialize>[1] | null)[]
): Policy[] {
  return compact(models).map((model) => ({
    id: model.id,
    abilities: serialize(user, model),
  }));
}

export default traceFunction({
  spanName: "presenters",
})(presentPolicy);
