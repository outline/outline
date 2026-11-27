import { compact } from "es-toolkit/compat";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { traceFunction } from "@server/logging/tracing";
import type { User } from "@server/models";
import Document from "@server/models/Document";
import { serialize } from "../policies";

type Policy = {
  id: string;
  abilities: Record<string, boolean | string[]>;
};

function presentPolicy(
  user: User,
  models: (Parameters<typeof serialize>[1] | null)[]
): Policy[] {
  return compact(models).map((model) => {
    const abilities = serialize(user, model);

    // A document the user cannot read means a query skipped the access gate.
    if (model instanceof Document && !abilities.read) {
      const message = `Presented a document that the user cannot read: document ${model.id}, user ${user.id}`;
      if (env.isTest) {
        throw new Error(message);
      }
      Logger.warn(message, {
        documentId: model.id,
        userId: user.id,
        teamId: user.teamId,
      });
    }

    return { id: model.id, abilities };
  });
}

export default traceFunction({
  spanName: "presenters",
})(presentPolicy);
