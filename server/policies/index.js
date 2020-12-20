// @flow
import { Attachment, Team, User, Collection, Document, Group } from "../models";
import policy from "./policy";
import "./apiKey";
import "./attachment";
import "./collection";
import "./document";
import "./integration";
import "./notificationSetting";
import "./share";
import "./user";
import "./team";
import "./group";

const { can, abilities } = policy;

type Policy = {
  [key: string]: boolean,
};

/*
 * Given a user and a model – output an object which describes the actions the
 * user may take against the model. This serialized policy is used for testing
 * and sent in API responses to allow clients to adjust which UI is displayed.
 */
export function serialize(
  model: User,
  target: Attachment | Team | Collection | Document | Group
): Policy {
  let output = {};

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

export default policy;
