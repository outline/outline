// @flow
import policy from './policy';
import { User, Team } from '../models';
import { AdminRequiredError } from '../errors';

const { allow } = policy;

allow(User, ['subscribe'], Team, (actor, team) => {
  if (!actor || actor.teamId !== team.id) return false;
  if (actor.isAdmin) return true;
  throw new AdminRequiredError();
});
