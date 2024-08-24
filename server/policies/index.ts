import type { Model } from "sequelize-typescript";
import type { User } from "@server/models";
import { abilities, can } from "./cancan";

// export everything from cancan
export * from "./cancan";

// Import all policies
import "./apiKey";
import "./attachment";
import "./authenticationProvider";
import "./collection";
import "./comment";
import "./document";
import "./fileOperation";
import "./integration";
import "./pins";
import "./searchQuery";
import "./share";
import "./star";
import "./subscription";
import "./user";
import "./team";
import "./group";
import "./webhookSubscription";
import "./notification";
import "./userMembership";

type Policy = Record<string, boolean>;

/*
 * Given a user and a model – output an object which describes the actions the
 * user may take against the model. This serialized policy is used for testing
 * and sent in API responses to allow clients to adjust which UI is displayed.
 */
export function serialize(model: User, target: Model | null): Policy {
  const output = {};
  abilities.forEach((ability) => {
    if (
      model instanceof ability.model &&
      target instanceof (ability.target as any)
    ) {
      let response = true;

      try {
        response = can(model, ability.action, target);
      } catch (err) {
        response = false;
      }

      output[ability.action] = response;
    }
  });
  return output;
}
