// @flow
import policy from './policy';
import { Team, User } from '../models';
import { AdminRequiredError } from '../errors';

const { allow } = policy;

allow(User, 'read', Team, (user, team) => team && user.teamId === team.id);

allow(User, ['update', 'export'], Team, (user, team) => {
  if (!team || user.teamId !== team.id) return false;
  if (user.isAdmin) return true;
  throw new AdminRequiredError();
});
