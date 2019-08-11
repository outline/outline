// @flow
import { Team, User, Collection, Document } from '../models';
import policy from './policy';
import './apiKey';
import './collection';
import './document';
import './integration';
import './notificationSetting';
import './share';
import './user';
import './team';

const { can, abilities } = policy;

export function serialize(model: User, target: Team | Collection | Document) {
  let output = {};

  abilities.forEach(ability => {
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
