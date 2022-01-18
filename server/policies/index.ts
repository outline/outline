import {
  Attachment,
  Team,
  User,
  Collection,
  Document,
  Group,
} from "@server/models";
import { _abilities, _can, _cannot, _authorize } from "./cancan";
import "./apiKey";
import "./attachment";
import "./authenticationProvider";
import "./collection";
import "./document";
import "./integration";
import "./notificationSetting";
import "./pins";
import "./searchQuery";
import "./share";
import "./star";
import "./user";
import "./team";
import "./group";

type Policy = Record<string, boolean>;

// this should not be needed but is a workaround for this TypeScript issue:
// https://github.com/microsoft/TypeScript/issues/36931
export const authorize: typeof _authorize = _authorize;

export const can = _can;

export const cannot = _cannot;

export const abilities = _abilities;

/*
 * Given a user and a model – output an object which describes the actions the
 * user may take against the model. This serialized policy is used for testing
 * and sent in API responses to allow clients to adjust which UI is displayed.
 */
export function serialize(
  model: User,
  target: Attachment | Team | Collection | Document | User | Group | null
): Policy {
  const output = {};
  abilities.forEach((ability) => {
    if (model instanceof ability.model && target instanceof ability.target) {
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
