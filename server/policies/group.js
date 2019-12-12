// @flow
import policy from './policy';
import { Group, User } from '../models';
import { AdminRequiredError } from '../errors';

const { allow } = policy;

allow(User, ['create', 'update', 'delete'], Group, (user, group) => {
  if (user.isAdmin) return true;
  throw new AdminRequiredError();
});
